import { type NextRequest } from "next/server";

import { requireAdmin } from "../../lib/authorization";
import { connectDB } from "../../lib/db";
import { Product, ProductVariant } from "../../models";
import {
  ApiError,
  handleApiError,
  ok,
  parseJsonBody,
  pickAllowedFields,
} from "../_utils/responses";
import {
  assertVariantSkusAvailable,
  buildProductPayload,
  parseListQuery,
  parseVariants,
  PRODUCT_FIELDS,
  replaceProductVariants,
  serializeAdminProduct,
  serializeCustomerProduct,
} from "./_utils";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const adminView = request.nextUrl.searchParams.get("scope") === "admin";

    if (adminView) {
      await requireAdmin();
    }

    const { filter, page, limit, skip, sort } = parseListQuery(request.nextUrl.searchParams, {
      admin: adminView,
    });
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    const productIds = products.map((product) => product._id);
    const variants =
      productIds.length > 0
        ? await ProductVariant.find({
            productId: { $in: productIds },
            isActive: true,
          })
            .sort({ createdAt: 1 })
            .lean()
        : [];
    const variantsByProductId = new Map<string, typeof variants>();

    for (const variant of variants) {
      const productId = variant.productId.toString();
      const productVariants = variantsByProductId.get(productId) ?? [];
      productVariants.push(variant);
      variantsByProductId.set(productId, productVariants);
    }

    return ok({
      products: products.map((product) =>
        adminView
          ? serializeAdminProduct(product, variantsByProductId.get(product._id.toString()) ?? [])
          : serializeCustomerProduct(product, variantsByProductId.get(product._id.toString()) ?? [])
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, "Products API GET error:");
  }
}

export async function POST(request: NextRequest) {
  let createdProductId: string | undefined;

  try {
    await requireAdmin();
    await connectDB();

    const body = await parseJsonBody(request);
    const payload = pickAllowedFields(body, PRODUCT_FIELDS);
    const productPayload = await buildProductPayload(payload);
    const variants = await parseVariants(payload.variants, productPayload.images ?? []);

    await assertVariantSkusAvailable(variants ?? []);

    const product = await Product.create(productPayload);
    createdProductId = product._id.toString();

    const productVariants = await replaceProductVariants(createdProductId, variants ?? []);
    const adminProduct = await Product.findById(createdProductId).lean();

    if (!adminProduct) {
      throw new ApiError(500, "Product was created but could not be loaded.");
    }

    return ok(
      {
        product: serializeAdminProduct(adminProduct, productVariants),
      },
      { status: 201 }
    );
  } catch (error) {
    if (createdProductId) {
      await Product.deleteOne({ _id: createdProductId });
    }

    return handleApiError(error, "Products API POST error:");
  }
}

