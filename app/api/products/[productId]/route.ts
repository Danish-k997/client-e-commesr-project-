import { type NextRequest } from "next/server";

import { requireAdmin } from "../../../lib/authorization";
import { connectDB } from "../../../lib/db";
import { Product } from "../../../models";
import {
  ApiError,
  handleApiError,
  ok,
  parseJsonBody,
  pickAllowedFields,
  requireObjectId,
} from "../../_utils/responses";
import {
  assertVariantSkusAvailable,
  buildProductPayload,
  destroyRemovedImages,
  findProductVariants,
  findPublicProduct,
  parseVariants,
  PRODUCT_FIELDS,
  replaceProductVariants,
  serializeAdminProduct,
  serializeCustomerProduct,
} from "../_utils";

type ProductRouteContext = {
  params: Promise<{ productId: string }>;
};

export async function GET(_request: NextRequest, { params }: ProductRouteContext) {
  try {
    const { productId } = await params;
    requireObjectId(productId, "productId");

    await connectDB();

    const adminView = _request.nextUrl.searchParams.get("scope") === "admin";

    if (adminView) {
      await requireAdmin();
    }

    const product = adminView ? await Product.findById(productId).lean() : await findPublicProduct(productId);

    if (!product) {
      throw new ApiError(404, "Product not found.");
    }

    const variants = await findProductVariants(productId);

    return ok({
      product: adminView ? serializeAdminProduct(product, variants) : serializeCustomerProduct(product, variants),
    });
  } catch (error) {
    return handleApiError(error, "Product API GET error:");
  }
}

export async function PATCH(request: NextRequest, { params }: ProductRouteContext) {
  try {
    await requireAdmin();

    const { productId } = await params;
    requireObjectId(productId, "productId");

    await connectDB();

    const existingProduct = await Product.findById(productId).lean();

    if (!existingProduct) {
      throw new ApiError(404, "Product not found.");
    }

    const body = await parseJsonBody(request);
    const payload = pickAllowedFields(body, PRODUCT_FIELDS, { requireAtLeastOne: true });
    const productPayload = await buildProductPayload(payload, { existingProduct });
    const variants = await parseVariants(payload.variants, productPayload.images ?? existingProduct.images);

    if (variants) {
      await assertVariantSkusAvailable(variants, productId);
    }

    const product = await Product.findByIdAndUpdate(productId, productPayload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!product) {
      throw new ApiError(404, "Product not found.");
    }

    const productVariants = variants
      ? await replaceProductVariants(productId, variants)
      : await findProductVariants(productId);

    if (payload.images !== undefined) {
      await destroyRemovedImages(existingProduct.images, productPayload.images ?? []);
    }

    return ok({ product: serializeAdminProduct(product, productVariants) });
  } catch (error) {
    return handleApiError(error, "Product API PATCH error:");
  }
}

export async function DELETE(_request: NextRequest, { params }: ProductRouteContext) {
  try {
    await requireAdmin();

    const { productId } = await params;
    requireObjectId(productId, "productId");

    await connectDB();

    const product = await Product.findByIdAndUpdate(
      productId,
      { status: "ARCHIVED" },
      { new: true, runValidators: true }
    ).lean();

    if (!product) {
      throw new ApiError(404, "Product not found.");
    }

    const variants = await findProductVariants(productId);

    return ok({ archived: true, product: serializeAdminProduct(product, variants) });
  } catch (error) {
    return handleApiError(error, "Product API DELETE error:");
  }
}
