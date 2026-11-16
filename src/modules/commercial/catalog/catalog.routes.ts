import { Router, type RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { authenticate, requireRoles } from '../../../middleware/auth.middleware.js';
import { AppError, BusinessRuleViolationError, NotFoundError } from '../../../middleware/error.middleware.js';
import { activeAt, revisePrice } from './pricing.service.js';

const text = (max: number) => z.string().trim().min(1).max(max);
const id = text(100);
const named = z.object({ code: text(50).regex(/^[A-Za-z0-9_-]+$/), name: text(200) });
const timestamp = z.string().datetime({ offset: true }).transform((value) => new Date(value));
const money = z.number().int().min(1).max(2_147_483_647);
const query = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: text(200).optional(),
  sortBy: z.enum(['code', 'name', 'createdAt']).default('code'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
}).strict();
const read = requireRoles('ADMIN', 'SALES', 'ACCOUNTANT', 'WAREHOUSE', 'DEALER');
const staff = requireRoles('ADMIN', 'SALES', 'ACCOUNTANT', 'WAREHOUSE');
const write = requireRoles('ADMIN', 'SALES');

function route(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve().then(() => handler(req, res, next)).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('QD2_CAPACITY')) {
        return next(new BusinessRuleViolationError('QD2', 'Đã đạt giới hạn số mặt hàng hoặc đơn vị tính'));
      }
      if (message.includes('INVALID_QD2_CONFIG')) {
        return next(new AppError('Cấu hình QĐ2 không hợp lệ', 500, 'INVALID_QD2_CONFIG'));
      }
      if (message.includes('Promotion_effective_window')) {
        return next(new AppError('Ngày kết thúc phải sau ngày bắt đầu', 422, 'INVALID_PROMOTION_WINDOW'));
      }
      // PostgreSQL 18 reports RESTRICT violations as 23001; Prisma 5 exposes
      // this as an unknown connector error rather than the usual P2003.
      if (error instanceof Prisma.PrismaClientUnknownRequestError && /code: "23001"/.test(message)) {
        return next(new AppError('Danh mục đang được sử dụng', 409, 'CATALOG_REFERENCE_CONFLICT'));
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') return next(new AppError('Mã hoặc tên đã tồn tại', 409, 'CATALOG_DUPLICATE'));
        if (error.code === 'P2003') return next(new AppError('Danh mục liên kết không hợp lệ hoặc đang được sử dụng', 409, 'CATALOG_REFERENCE_CONFLICT'));
        if (error.code === 'P2025') return next(new NotFoundError('Catalog record'));
        if (error.code === 'P2034') return next(new AppError('Dữ liệu đang được cập nhật, vui lòng thử lại', 409, 'WRITE_CONFLICT'));
      }
      next(error);
    });
  };
}

type ListOptions = { skip: number; take: number; orderBy: Array<Record<string, 'asc' | 'desc'>> };
type Scope = (dealer: boolean) => object;
type Filters = Record<string, string | undefined>;

function catalogRoutes<T extends z.ZodRawShape, W extends object>(options: {
  schema: z.ZodObject<T>;
  filters?: string[];
  sortableName?: boolean;
  where: (search: string | undefined, filters: Filters) => W;
  scope?: Scope;
  list: (where: W, scope: object, options: ListOptions) => Promise<[number, unknown[]]>;
  get: (key: string, scope: object) => Promise<unknown>;
  create: (body: z.output<z.ZodObject<T>>) => Promise<unknown>;
  update: (key: string, body: z.output<ReturnType<z.ZodObject<T>['partial']>>) => Promise<unknown>;
  remove: (key: string) => Promise<unknown>;
}) {
  const router = Router();
  router.use(authenticate);
  const filtersSchema = z.object(Object.fromEntries((options.filters ?? []).map((field) => [field, text(200).optional()])));
  router.get('/', read, route(async (req, res) => {
    const { page, limit, search, sortBy, sortOrder, ...rawFilters } = query.passthrough().parse(req.query);
    const filters = filtersSchema.strict().parse(rawFilters);
    if (sortBy === 'name' && options.sortableName === false) {
      throw new AppError('Trường sắp xếp không được hỗ trợ', 400, 'VALIDATION_ERROR');
    }
    const [total, data] = await options.list(
      options.where(search, filters), options.scope?.(req.user!.role === 'DEALER') ?? {},
      { skip: (page - 1) * limit, take: limit, orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }] },
    );
    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }));
  router.get('/:id', read, route(async (req, res) => {
    const data = await options.get(id.parse(req.params.id), options.scope?.(req.user!.role === 'DEALER') ?? {});
    if (!data) throw new NotFoundError('Catalog record');
    res.json({ success: true, data });
  }));
  router.post('/', write, route(async (req, res) => {
    res.status(201).json({ success: true, data: await options.create(options.schema.strict().parse(req.body)) });
  }));
  router.patch('/:id', write, route(async (req, res) => {
    const body = options.schema.partial().strict()
      .refine((value) => Object.keys(value).length > 0, 'Provide at least one field').parse(req.body);
    res.json({ success: true, data: await options.update(id.parse(req.params.id), body) });
  }));
  router.delete('/:id', write, route(async (req, res) => {
    await options.remove(id.parse(req.params.id));
    res.status(204).end();
  }));
  return router;
}

const matches = (value: string) => ({ contains: value, mode: 'insensitive' as const });
const byCodeOrName = (search: string | undefined, filters: Filters) => ({
  ...filters,
  ...(search ? { OR: [{ code: matches(search) }, { name: matches(search) }] } : {}),
});
export const categoryRoutes = catalogRoutes({
  schema: named,
  where: byCodeOrName,
  list: (where, _scope, options) => prisma.$transaction([
    prisma.category.count({ where }), prisma.category.findMany({ where, ...options }),
  ]),
  get: (id) => prisma.category.findUnique({ where: { id } }),
  create: (data) => prisma.category.create({ data }),
  update: (id, data) => prisma.category.update({ where: { id }, data }),
  remove: (id) => prisma.category.delete({ where: { id } }),
});
export const productRoutes = catalogRoutes({
  schema: named.extend({ categoryId: id }),
  where: byCodeOrName,
  filters: ['categoryId'],
  list: (where, _scope, options) => prisma.$transaction([
    prisma.product.count({ where }), prisma.product.findMany({ where, ...options }),
  ]),
  get: (id) => prisma.product.findUnique({ where: { id } }),
  create: (data) => prisma.product.create({ data }),
  update: (id, data) => prisma.product.update({ where: { id }, data }),
  remove: (id) => prisma.product.delete({ where: { id } }),
});
export const unitRoutes = catalogRoutes({
  schema: named,
  where: byCodeOrName,
  list: (where, _scope, options) => prisma.$transaction([
    prisma.unitOfMeasure.count({ where }), prisma.unitOfMeasure.findMany({ where, ...options }),
  ]),
  get: (id) => prisma.unitOfMeasure.findUnique({ where: { id } }),
  create: (data) => prisma.unitOfMeasure.create({ data }),
  update: (id, data) => prisma.unitOfMeasure.update({ where: { id }, data }),
  remove: (id) => prisma.unitOfMeasure.delete({ where: { id } }),
});
export const skuRoutes = catalogRoutes({
  schema: z.object({ code: named.shape.code, productId: id, unit: named.shape.name }),
  where: (search, { productId, unit }) => ({
    productId, unit,
    ...(search ? { OR: [{ code: matches(search) }, { product: { name: matches(search) } }] } : {}),
  }),
  filters: ['productId', 'unit'],
  sortableName: false,
  list: (where, _scope, options) => prisma.$transaction([
    prisma.sku.count({ where }), prisma.sku.findMany({ where, ...options }),
  ]),
  get: (id) => prisma.sku.findUnique({ where: { id } }),
  create: (data) => prisma.sku.create({ data }),
  update: (id, data) => prisma.sku.update({ where: { id }, data }),
  remove: (id) => prisma.sku.delete({ where: { id } }),
});

export const promotionRoutes = catalogRoutes({
  schema: named.extend({
    skuId: id,
    minimumQuantity: money,
    discountPercent: z.number().int().min(1).max(100),
    effectiveFrom: timestamp,
    effectiveTo: timestamp,
    isActive: z.boolean(),
  }),
  where: byCodeOrName,
  filters: ['skuId'],
  scope: (dealer) => {
    const now = new Date();
    return dealer ? { isActive: true, effectiveFrom: { lte: now }, effectiveTo: { gt: now } } : {};
  },
  list: (filters, scope, options) => {
    const where = { ...filters, ...scope };
    return prisma.$transaction([
      prisma.promotion.count({ where }), prisma.promotion.findMany({ where, ...options }),
    ]);
  },
  get: (id, scope) => prisma.promotion.findFirst({ where: { id, ...scope } }),
  create: (data) => prisma.promotion.create({ data }),
  update: (id, data) => prisma.promotion.update({ where: { id }, data }),
  remove: (id) => prisma.promotion.delete({ where: { id } }),
});

const priceQuery = query.pick({ page: true, limit: true }).extend({
  skuId: id.optional(), activeOnly: z.enum(['true', 'false']).default('true'),
}).strict();
const priceBody = z.object({ skuId: id, importPrice: money }).strict();
const publicPrice = {
  id: true, skuId: true, exportPrice: true, effectiveFrom: true, effectiveTo: true,
} satisfies Prisma.PricingSelect;
export const pricingRoutes = Router();
pricingRoutes.use(authenticate);
pricingRoutes.get('/', read, route(async (req, res) => {
  const { page, limit, skuId, activeOnly } = priceQuery.parse(req.query);
  const dealer = req.user!.role === 'DEALER';
  const where = { skuId, ...(dealer || activeOnly === 'true' ? activeAt(new Date()) : {}) };
  const [total, data] = await prisma.$transaction([
    prisma.pricing.count({ where }),
    prisma.pricing.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
      select: dealer ? publicPrice : { ...publicPrice, importPrice: true },
    }),
  ]);
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));
pricingRoutes.get('/:id', staff, route(async (req, res) => {
  const key = id.parse(req.params.id);
  const data = await prisma.pricing.findUnique({ where: { id: key } });
  if (!data) throw new NotFoundError('Pricing', key);
  res.json({ success: true, data });
}));
pricingRoutes.post('/', write, route(async (req, res) => {
  const { skuId, importPrice } = priceBody.parse(req.body);
  res.status(201).json({ success: true, data: await revisePrice(skuId, importPrice) });
}));
pricingRoutes.patch('/:id', write, route(async (req, res) => {
  const key = id.parse(req.params.id);
  const { importPrice } = priceBody.pick({ importPrice: true }).parse(req.body);
  const price = await prisma.pricing.findUnique({ where: { id: key } });
  if (!price) throw new NotFoundError('Pricing', key);
  res.json({ success: true, data: await revisePrice(price.skuId, importPrice, key) });
}));
