import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";

const accent = "#ab8a48";
const pageBg = "#ffffff";
const STATUS_OPTIONS = ["draft", "active", "inactive"];
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const FABRIC_OPTIONS = ["Cotton", "Linen", "Silk", "Organic Cotton", "Other"];
const TAX_PERCENT_OPTIONS = ["0", "5", "12", "18"];
const SECTIONS = ["Basic Info", "Pricing", "Flags", "SEO", "Variants"];

const PRODUCT_FLAG_FIELDS = [
  { key: "isTrending", label: "Trending" },
  { key: "isFeatured", label: "Featured" },
  { key: "isNewArrival", label: "New arrival" },
  { key: "isBestSeller", label: "Best seller" },
  { key: "isOnSale", label: "On sale" },
];

const createEmptyProductFlags = () =>
  Object.fromEntries(PRODUCT_FLAG_FIELDS.map(({ key }) => [key, false]));

function mapFlagsFromProduct(product) {
  const flags = product?.flags && typeof product.flags === "object" ? product.flags : {};
  return Object.fromEntries(
    PRODUCT_FLAG_FIELDS.map(({ key }) => [key, Boolean(flags[key] ?? product?.[key])])
  );
}

const createEmptyVariant = () => ({
  colorName: "",
  colorHexCode: "",
  size: "M",
  stock: "",
});

const initialForm = {
  name: "",
  description: "",
  brand: "Shree",
  category: "",
  fabric: "",
  tags: "",
  regularPrice: "",
  discountPrice: "",
  taxPercent: "5",
  status: "draft",
  metaTitle: "",
  metaDescription: "",
  ...createEmptyProductFlags(),
  variants: [createEmptyVariant()],
};

function pickCategoryId(node) {
  if (node == null) return null;
  return node._id ?? node.id ?? null;
}

function normalizeCategoriesListPayload(payload) {
  const root = payload?.data !== undefined ? payload.data : payload;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.categories)) return root.categories;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.data)) return root.data;
  if (root && typeof root === "object") {
    const firstArray = Object.values(root).find((value) => Array.isArray(value));
    if (firstArray) return firstArray;
  }
  return [];
}

function getProductFormErrorMessage(error, isEdit) {
  const rawMessage = getApiErrorMessage(error, "");
  if (!rawMessage) return isEdit ? "Failed to update product." : "Failed to create product.";

  if (rawMessage.toLowerCase().includes("invalid enum value")) {
    return `Please select a valid fabric: ${FABRIC_OPTIONS.join(", ")}.`;
  }

  return rawMessage;
}

function mapProductToForm(product) {
  if (!product) return initialForm;
  const cat = product.category;
  const categoryId =
    typeof cat === "object" && cat !== null ? String(cat._id ?? cat.id ?? "") : String(cat ?? "");

  const tagsRaw = product.tags;
  const tags =
    Array.isArray(tagsRaw) ? tagsRaw.map((t) => String(t).trim()).filter(Boolean).join(", ") : String(tagsRaw ?? "");

  const rawVariants = Array.isArray(product.variants) ? product.variants : [];
  const variants =
    rawVariants.length > 0
      ? rawVariants.map((item) => ({
          colorName: String(item?.color?.name ?? item?.colorName ?? "").trim(),
          colorHexCode: String(item?.color?.hexCode ?? item?.colorHexCode ?? "").trim(),
          size: item?.size || "M",
          stock: item?.stock != null && item?.stock !== "" ? String(item.stock) : "",
        }))
      : [createEmptyVariant()];

  return {
    name: String(product.name ?? "").trim(),
    description: String(product.description ?? ""),
    brand: String(product.brand ?? "Shree"),
    category: categoryId,
    fabric: String(product.fabric ?? ""),
    tags,
    regularPrice: product.regularPrice != null ? String(product.regularPrice) : "",
    discountPrice: product.discountPrice != null ? String(product.discountPrice) : "",
    taxPercent: String(product.taxPercent ?? product.tax ?? "5"),
    status: product.status || "draft",
    metaTitle: String(product.seo?.metaTitle ?? product.metaTitle ?? ""),
    metaDescription: String(product.seo?.metaDescription ?? product.metaDescription ?? ""),
    ...mapFlagsFromProduct(product),
    variants,
  };
}

function buildProductFlagsPayload(form) {
  return Object.fromEntries(PRODUCT_FLAG_FIELDS.map(({ key }) => [key, Boolean(form[key])]));
}

async function updateProductFlags(productId, flags) {
  const { data } = await client.patch(`/admin/products/${encodeURIComponent(productId)}/flags`, flags);
  return normalizeProductPayload(data);
}

function normalizeProductImages(product) {
  if (!Array.isArray(product?.images)) return [];
  return product.images
    .map((image) => ({
      key: image?.key || "",
      displayOrder: Number(image?.displayOrder ?? 0),
      url: image?.url || image?.imageUrl || "",
    }))
    .filter((image) => Boolean(image.key))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

function pickProductId(product) {
  if (!product) return null;
  return product._id ?? product.id ?? product.productId ?? null;
}

function normalizeProductPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.product ?? root;
  }
  return root;
}

async function getProductImageUploadUrl(productId, payload) {
  const { data } = await client.post(`/admin/products/${productId}/upload-url`, payload);
  return data?.data !== undefined ? data.data : data;
}

// async function uploadProductImageToS3(uploadUrl, file) {
//   const response = await fetch(uploadUrl, {
//     method: "PUT",
//     headers: { "Content-Type": file.type || "application/octet-stream" },
//     body: file,
//   });
//   if (!response.ok) {
//     throw new Error("Failed to upload image to S3.");
//   }
//   return true;
// }

async function confirmProductImageUpload(productId, payload) {
  const { data } = await client.post(`/admin/products/${productId}/image-confirm`, payload);
  return normalizeProductPayload(data);
}

async function deleteProductImage(productId, key) {
  const encodedKey = encodeURIComponent(key);
  const { data } = await client.delete(`/admin/products/${productId}/images/${encodedKey}`);
  return data?.data !== undefined ? data.data : data;
}

function newStagingId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Upload one file via presigned URL + confirm; returns normalized product payload (or null). */
async function uploadOneFileToProduct(productId, file, displayOrder) {
  const uploadPayload = {
    contentType: file.type || "application/octet-stream",
    fileName: file.name || `product-image-${Date.now()}.jpg`,
  };
  const uploadData = await getProductImageUploadUrl(productId, uploadPayload);
  const uploadUrl = uploadData?.uploadUrl;
  const key = uploadData?.key;

  if (!uploadUrl || !key) {
    throw new Error("Upload URL response is missing uploadUrl or key.");
  }

  // await uploadProductImageToS3(uploadUrl, file);
  return confirmProductImageUpload(productId, {
    key,
    displayOrder: Number(displayOrder),
  });
}

const AdminProductCreate = () => {
  const navigate = useNavigate();
  const { productId: editRouteProductId } = useParams();
  const isEditMode = Boolean(editRouteProductId?.trim());
  const roleGate = localStorage.getItem("role");

  const [form, setForm] = useState(initialForm);
  const originalFormRef = useRef(initialForm);
  const [categories, setCategories] = useState([]);
  const [creating, setCreating] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEditMode);
  const [createdProductId, setCreatedProductId] = useState(isEditMode ? String(editRouteProductId).trim() : "");
  const [productImages, setProductImages] = useState([]);
  /** Local queue: selected files not yet uploaded (shown before first save on create, or before "Upload all"). */
  const [stagingFiles, setStagingFiles] = useState([]);
  const imageFileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageSuccess, setImageSuccess] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const { data } = await client.get("/admin/categories");
      setCategories(normalizeCategoriesListPayload(data));
    } catch {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadProductForEdit = useCallback(async () => {
    const id = editRouteProductId?.trim();
    if (!id) return;
    setLoadingProduct(true);
    setError("");
    try {
      const { data } = await client.get(`/admin/products/${encodeURIComponent(id)}`);
      const product = normalizeProductPayload(data);
      if (!product) {
        setError("Product not found.");
        return;
      }
      const mapped = mapProductToForm(product);
      setForm(mapped);
      originalFormRef.current = mapped;
      const pid = pickProductId(product);
      setCreatedProductId(pid ? String(pid) : id);
      const nextImages = normalizeProductImages(product);
      setProductImages(nextImages);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load product."));
    } finally {
      setLoadingProduct(false);
    }
  }, [editRouteProductId]);

  useEffect(() => {
    if (isEditMode) loadProductForEdit();
  }, [isEditMode, loadProductForEdit]);

  const onFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onFlagChange = (key, checked) => {
    setForm((prev) => ({ ...prev, [key]: Boolean(checked) }));
  };

  const onVariantChange = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  };

  const addVariant = () => {
    setForm((prev) => ({ ...prev, variants: [...prev.variants, createEmptyVariant()] }));
  };

  const removeVariant = (index) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.length === 1 ? prev.variants : prev.variants.filter((_, i) => i !== index),
    }));
  };

  const appendImagesFromInput = (event) => {
    const picked = Array.from(event.target.files || []).filter((f) => f && String(f.type || "").startsWith("image/"));
    if (!picked.length) return;
    setStagingFiles((prev) => [...prev, ...picked.map((file) => ({ id: newStagingId(), file }))]);
    setImageError("");
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }
  };

  const removeStagingRow = (id) => {
    setStagingFiles((prev) => prev.filter((row) => row.id !== id));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setImageError("");
    setImageSuccess("");

    const stagingSnapshot = [...stagingFiles];

    const parsedTags = form.tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const variants = form.variants
      .map((item) => ({
        color: {
          name: item.colorName.trim(),
          hexCode: item.colorHexCode.trim().toUpperCase(),
        },
        size: item.size,
        stock: Number(item.stock),
      }))
      .filter((item) => item.color.name && item.color.hexCode && item.size && Number.isFinite(item.stock));

    if (!form.name.trim() || !form.category || !variants.length) {
      setError("Name, category and at least one valid variant are required.");
      return;
    }

    const flagsPayload = buildProductFlagsPayload(form);

    setCreating(true);
    let flagsError = "";
    let imageUploadError = "";
    let savedProductId = "";
    try {
      if (isEditMode) {
        const id = editRouteProductId.trim();
        const orig = originalFormRef.current;

        const payload = {};
        if (form.name.trim() !== orig.name) payload.name = form.name.trim();
        if (form.description.trim() !== orig.description.trim()) payload.description = form.description.trim();
        if (form.brand.trim() !== orig.brand) payload.brand = form.brand.trim();
        if (form.category !== orig.category) payload.category = form.category;
        if (form.fabric !== orig.fabric) payload.fabric = form.fabric;
        if (form.status !== orig.status) payload.status = form.status;
        if (String(form.regularPrice) !== String(orig.regularPrice)) payload.regularPrice = Number(form.regularPrice);
        if (String(form.discountPrice) !== String(orig.discountPrice)) payload.discountPrice = Number(form.discountPrice);
        if (String(form.taxPercent) !== String(orig.taxPercent)) payload.taxPercent = Number(form.taxPercent);

        const origParsedTags = orig.tags.split(",").map((t) => t.trim()).filter(Boolean);
        if (JSON.stringify(parsedTags) !== JSON.stringify(origParsedTags)) payload.tags = parsedTags;

        const newMetaTitle = form.metaTitle.trim();
        const newMetaDesc = form.metaDescription.trim();
        if (newMetaTitle !== orig.metaTitle.trim() || newMetaDesc !== orig.metaDescription.trim()) {
          payload.seo = { metaTitle: newMetaTitle, metaDescription: newMetaDesc };
        }

        const origVariantsPayload = orig.variants
          .map((item) => ({
            color: { name: item.colorName.trim(), hexCode: item.colorHexCode.trim().toUpperCase() },
            size: item.size,
            stock: Number(item.stock),
          }))
          .filter((item) => item.color.name && item.color.hexCode && item.size && Number.isFinite(item.stock));
        if (JSON.stringify(variants) !== JSON.stringify(origVariantsPayload)) payload.variants = variants;

        const hasFieldChanges = Object.keys(payload).length > 0;
        const flagsChanged = PRODUCT_FLAG_FIELDS.some(({ key }) => Boolean(form[key]) !== Boolean(orig[key]));

        savedProductId = id;
        let mergedProduct = null;

        if (hasFieldChanges) {
          const { data } = await client.put(`/admin/products/${encodeURIComponent(id)}`, payload);
          mergedProduct = normalizeProductPayload(data);
          const nextId = pickProductId(mergedProduct) || id;
          savedProductId = String(nextId);
        }

        if (flagsChanged) {
          try {
            mergedProduct = (await updateProductFlags(savedProductId, flagsPayload)) ?? mergedProduct;
          } catch (flagErr) {
            flagsError = getApiErrorMessage(flagErr, "Product saved but failed to update flags.");
          }
        }

        setCreatedProductId(savedProductId);
        if (mergedProduct) setProductImages(normalizeProductImages(mergedProduct));

        if (savedProductId && stagingSnapshot.length > 0) {
          setUploadingImage(true);
          let uploadBase = mergedProduct ?? { images: productImages };
          try {
            for (const row of stagingSnapshot) {
              const order = normalizeProductImages(uploadBase).length;
              uploadBase = await uploadOneFileToProduct(savedProductId, row.file, order);
            }
            setProductImages(normalizeProductImages(uploadBase));
            setStagingFiles([]);
          } catch (imgErr) {
            imageUploadError = getApiErrorMessage(imgErr, "Product saved but image upload failed.");
          } finally {
            setUploadingImage(false);
          }
        }
      } else {
        const payload = {
          name: form.name.trim(),
          description: form.description.trim(),
          brand: form.brand.trim(),
          category: form.category,
          fabric: form.fabric,
          tags: parsedTags,
          regularPrice: Number(form.regularPrice),
          discountPrice: Number(form.discountPrice),
          taxPercent: Number(form.taxPercent),
          status: form.status,
          seo: {
            metaTitle: form.metaTitle.trim(),
            metaDescription: form.metaDescription.trim(),
          },
          variants,
        };
        const { data } = await client.post("/admin/products", payload);
        const created = normalizeProductPayload(data);
        const id = pickProductId(created);
        savedProductId = id ? String(id) : "";
        let mergedProduct = created;
        if (savedProductId) {
          try {
            mergedProduct = (await updateProductFlags(savedProductId, flagsPayload)) ?? mergedProduct;
          } catch (flagErr) {
            flagsError = getApiErrorMessage(flagErr, "Product created but failed to update flags.");
          }
        }
        setCreatedProductId(savedProductId);
        setProductImages(normalizeProductImages(mergedProduct));

        if (savedProductId && stagingSnapshot.length > 0) {
          setUploadingImage(true);
          try {
            for (const row of stagingSnapshot) {
              const order = normalizeProductImages(mergedProduct).length;
              mergedProduct = await uploadOneFileToProduct(savedProductId, row.file, order);
            }
            setProductImages(normalizeProductImages(mergedProduct));
            setStagingFiles([]);
          } catch (imgErr) {
            imageUploadError = getApiErrorMessage(imgErr, "Product saved but image upload failed.");
          } finally {
            setUploadingImage(false);
          }
        }
      }

      if (flagsError) {
        setError(flagsError);
      } else if (imageUploadError) {
        setImageError(imageUploadError);
      } else if (savedProductId) {
        navigate(`/admin/products/${encodeURIComponent(savedProductId)}`);
        return;
      }
    } catch (e) {
      setError(getProductFormErrorMessage(e, isEditMode));
    } finally {
      setCreating(false);
    }
  };

  const handleUploadAllStaging = async () => {
    if (!createdProductId) {
      setImageError(isEditMode ? "Product id missing. Reload the page." : "Save the product first, then upload queued images.");
      return;
    }
    if (!stagingFiles.length) {
      setImageError("Add at least one image to the queue before uploading.");
      return;
    }

    setImageError("");
    setImageSuccess("");
    setUploadingImage(true);

    const queue = [...stagingFiles];

    try {
      let lastProductPayload = null;
      for (const row of queue) {
        const orderSoFar = normalizeProductImages(lastProductPayload ?? { images: productImages }).length;
        lastProductPayload = await uploadOneFileToProduct(createdProductId, row.file, orderSoFar);
      }

      const nextImages = normalizeProductImages(lastProductPayload ?? { images: productImages });
      setProductImages(nextImages);
      setStagingFiles([]);
      setImageSuccess(`${queue.length} image(s) uploaded and confirmed.`);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = "";
      }
    } catch (e) {
      setImageError(getApiErrorMessage(e, "Failed to upload image(s)."));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (key) => {
    if (!createdProductId || !key) return;
    setImageError("");
    setImageSuccess("");
    setUploadingImage(true);
    try {
      await deleteProductImage(createdProductId, key);
      const nextImages = productImages.filter((item) => item.key !== key);
      setProductImages(nextImages);
      setImageSuccess("Image deleted.");
    } catch (e) {
      setImageError(getApiErrorMessage(e, "Failed to delete image."));
    } finally {
      setUploadingImage(false);
    }
  };

  if (!["super_admin", "manager"].includes(roleGate || "")) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: pageBg }}>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/admin/dashboard")}>
          Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Products", to: "/admin/products" },
            ...(isEditMode
              ? [
                  {
                    label: "Product",
                    to: `/admin/products/${encodeURIComponent(editRouteProductId.trim())}`,
                  },
                  { label: "Edit" },
                ]
              : [{ label: "Create Product" }]),
          ]}
        />
        <Paper
          component="form"
          onSubmit={handleCreate}
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            border: `1px solid ${alpha("#0f3828", 0.1)}`,
            boxShadow: "0 12px 30px rgba(20, 55, 42, 0.08)",
          }}
        >
          <Stack spacing={1.1} sx={{ mb: 2.2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1f2a24" }}>
              {isEditMode ? "Edit Product" : "Create Product"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#5a6761" }}>
              {isEditMode ? "Update catalog fields, variants, and images." : "Fill all fields in one form and create product quickly."}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ pt: 0.4 }}>
              {SECTIONS.map((section, index) => (
                <Chip
                  key={section}
                  label={`${index + 1}. ${section}`}
                  size="small"
                  sx={{
                    bgcolor: alpha(accent, 0.1),
                    color: "#2a4135",
                    fontWeight: 700,
                    border: `1px solid ${alpha(accent, 0.2)}`,
                  }}
                />
              ))}
            </Stack>
          </Stack>

          {loadingProduct ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={32} sx={{ color: accent }} />
            </Box>
          ) : (
            <>
              <Stack spacing={1.75}>
            <TextField label="Name" fullWidth size="small" value={form.name} onChange={(e) => onFormChange("name", e.target.value)} required />

            <FormControl fullWidth size="small" >
              <InputLabel id="create-category-label">Category</InputLabel>
              <Select
                labelId="create-category-label"
                label="Category"
                value={form.category}
                onChange={(e) => onFormChange("category", e.target.value)}
              >
                {categories.map((category) => {
                  const id = pickCategoryId(category);
                  if (!id) return null;
                  return (
                    <MenuItem key={String(id)} value={String(id)}>
                      {String(category?.name || id)}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              size="small"
              value={form.description}
              onChange={(e) => onFormChange("description", e.target.value)}
            />

            <TextField label="Brand" fullWidth size="small" value={form.brand} onChange={(e) => onFormChange("brand", e.target.value)} />

            <FormControl fullWidth size="small">
              <InputLabel id="create-fabric-label">Fabric</InputLabel>
              <Select
                labelId="create-fabric-label"
                label="Fabric"
                value={form.fabric}
                onChange={(e) => onFormChange("fabric", e.target.value)}
              >
                <MenuItem value="">
                  <em>Select fabric</em>
                </MenuItem>
                {form.fabric && !FABRIC_OPTIONS.includes(form.fabric) ? (
                  <MenuItem value={form.fabric}>{form.fabric}</MenuItem>
                ) : null}
                {FABRIC_OPTIONS.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="create-status-label">Status</InputLabel>
              <Select
                labelId="create-status-label"
                label="Status"
                value={form.status}
                onChange={(e) => onFormChange("status", e.target.value)}
              >
                {form.status && !STATUS_OPTIONS.includes(form.status) ? (
                  <MenuItem value={form.status} sx={{ textTransform: "capitalize" }}>
                    {form.status} (current)
                  </MenuItem>
                ) : null}
                {STATUS_OPTIONS.map((item) => (
                  <MenuItem key={item} value={item} sx={{ textTransform: "capitalize" }}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField label="Tags (comma separated)" fullWidth size="small" value={form.tags} onChange={(e) => onFormChange("tags", e.target.value)} />

            <TextField label="Regular Price" type="number" fullWidth size="small" value={form.regularPrice} onChange={(e) => onFormChange("regularPrice", e.target.value)} required />

            <TextField label="Discount Price" type="number" fullWidth size="small" value={form.discountPrice} onChange={(e) => onFormChange("discountPrice", e.target.value)} required />

            <FormControl fullWidth size="small">
              <InputLabel id="create-tax-percent-label">Tax Percent</InputLabel>
              <Select
                labelId="create-tax-percent-label"
                label="Tax Percent"
                value={form.taxPercent}
                onChange={(e) => onFormChange("taxPercent", e.target.value)}
              >
                {TAX_PERCENT_OPTIONS.map((pct) => (
                  <MenuItem key={pct} value={pct}>
                    {pct}%
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField label="SEO Meta Title" fullWidth size="small" value={form.metaTitle} onChange={(e) => onFormChange("metaTitle", e.target.value)} />

            <TextField label="SEO Meta Description" fullWidth size="small" value={form.metaDescription} onChange={(e) => onFormChange("metaDescription", e.target.value)} />
              </Stack>

              <Box sx={{ mt: 2.5 }}>


              <Paper elevation={0} sx={{ p: 1 }}>
              <Typography sx={{ mb: 0.75, fontWeight: 800, color: "#1f2a24" }}>Product flags</Typography>
              <Typography variant="body2" sx={{ mb: 1.1, color: "#5a6761" }}>
                Mark this product for storefront highlights (saved with the product).
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={0.5} useFlexGap flexWrap="wrap">
                {PRODUCT_FLAG_FIELDS.map(({ key, label }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={Boolean(form[key])}
                        onChange={(e) => onFlagChange(key, e.target.checked)}
                        size="small"
                        sx={{ color: alpha(accent, 0.6), "&.Mui-checked": { color: accent } }}
                      />
                    }
                    label={label}
                    sx={{ mr: 2, "& .MuiFormControlLabel-label": { fontSize: "0.9rem", color: "#2a4135", fontWeight: 600 } }}
                  />
                ))}
              </Stack>
            </Paper>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography sx={{ fontWeight: 800, color: "#1f2a24" }}>Variants</Typography>
              <Button size="small" variant="outlined" onClick={addVariant} sx={{ textTransform: "none", borderColor: alpha("#0f3828", 0.2), color: "#1f2a24" }}>
                Add Variant
              </Button>
            </Stack>
            <Stack spacing={1.25}>
              {form.variants.map((variant, index) => (
                <Paper key={`variant-${index}`} elevation={0} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.12)}`, bgcolor: "#fcfcfc" }}>
                  <Typography sx={{ mb: 1.1, fontWeight: 700, color: "#2a4135" }}>
                    Variant {index + 1}
                  </Typography>
                  <Stack spacing={1.25}>
                    <TextField label="Color Name" size="small" fullWidth value={variant.colorName} onChange={(e) => onVariantChange(index, "colorName", e.target.value)} required />
                    <TextField label="Hex Code" size="small" fullWidth value={variant.colorHexCode} onChange={(e) => onVariantChange(index, "colorHexCode", e.target.value)} required />
                    <FormControl fullWidth size="small">
                      <InputLabel id={`size-label-${index}`}>Size</InputLabel>
                      <Select labelId={`size-label-${index}`} label="Size" value={variant.size} onChange={(e) => onVariantChange(index, "size", e.target.value)}>
                        {SIZE_OPTIONS.map((size) => (
                          <MenuItem key={size} value={size}>
                            {size}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField label="Stock" type="number" size="small" fullWidth value={variant.stock} onChange={(e) => onVariantChange(index, "stock", e.target.value)} required />
                    <Box>
                      <Button size="small" color="error" variant="text" onClick={() => removeVariant(index)} sx={{ textTransform: "none", minWidth: 0, px: 0 }}>
                        Remove
                      </Button>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
              </Box>
            </>
          )}

          {!loadingProduct && (!isEditMode || Boolean(String(createdProductId || "").trim())) ? (
            <Box sx={{ mt: 2.5 }}>
              <Typography sx={{ mb: 1.1, fontWeight: 800, color: "#1f2a24" }}>Product images</Typography>
              <Typography variant="body2" sx={{ mb: 1.2, color: "#5a6761" }}>
                {createdProductId
                  ? "Add one or more images to the queue, then upload. Display order is set automatically (append)."
                  : "Add images to the queue now; after you create the product, they upload only if the queue is not empty. No upload API runs until then."}
              </Typography>
              <Stack spacing={1.2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap>
                  <Button variant="outlined" component="label" sx={{ textTransform: "none", borderColor: alpha("#0f3828", 0.2), color: "#1f2a24" }}>
                    Add images (multi)
                    <input
                      ref={imageFileInputRef}
                      hidden
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={appendImagesFromInput}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="contained"
                    onClick={handleUploadAllStaging}
                    disabled={uploadingImage || creating || !stagingFiles.length || !String(createdProductId || "").trim()}
                    sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, boxShadow: "none", "&:hover": { bgcolor: "#8f723c" } }}
                  >
                    {uploadingImage ? "Uploading…" : "Upload queued images"}
                  </Button>
                </Stack>
                {stagingFiles.length ? (
                  <Stack spacing={0.75}>
                    <Typography variant="caption" sx={{ color: "#5a6761", fontWeight: 700 }}>
                      Queued (not on server yet)
                    </Typography>
                    {stagingFiles.map((row) => (
                      <Paper
                        key={row.id}
                        elevation={0}
                        sx={{ p: 1.1, borderRadius: 2, border: `1px dashed ${alpha(accent, 0.45)}`, bgcolor: alpha(accent, 0.04) }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" sx={{ color: "#2a4135", wordBreak: "break-all" }}>
                            {row.file.name}
                          </Typography>
                          <Button size="small" color="error" variant="text" onClick={() => removeStagingRow(row.id)} sx={{ textTransform: "none", flexShrink: 0 }}>
                            Remove
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                ) : null}
                {productImages.length ? (
                  <Stack spacing={1}>
                    <Typography variant="caption" sx={{ color: "#5a6761", fontWeight: 700 }}>
                      On server
                    </Typography>
                    {productImages.map((image) => (
                      <Paper
                        key={image.key}
                        elevation={0}
                        sx={{ p: 1.2, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.12)}`, bgcolor: "#fcfcfc" }}
                      >
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ color: "#2a4135", fontWeight: 700 }}>
                              Order: {image.displayOrder}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#5a6761", wordBreak: "break-all" }}>
                              {image.key}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} flexShrink={0}>
                            {image.url ? (
                              <Button size="small" variant="outlined" component="a" href={image.url} target="_blank" rel="noreferrer" sx={{ textTransform: "none" }}>
                                Open
                              </Button>
                            ) : null}
                            <Button
                              size="small"
                              color="error"
                              variant="text"
                              onClick={() => handleDeleteImage(image.key)}
                              disabled={uploadingImage}
                              sx={{ textTransform: "none" }}
                            >
                              Remove
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            </Box>
          ) : null}

          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
          {success ? <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert> : null}
          {imageError ? <Alert severity="error" sx={{ mt: 2 }}>{imageError}</Alert> : null}
          {imageSuccess ? <Alert severity="success" sx={{ mt: 2 }}>{imageSuccess}</Alert> : null}

          <Stack direction="row" gap={2} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() =>
                isEditMode
                  ? navigate(`/admin/products/${encodeURIComponent(editRouteProductId.trim())}`)
                  : navigate("/admin/products")
              }
              sx={{ textTransform: "none", fontWeight: 700, borderColor: alpha("#0f3828", 0.25), color: "#1f2a24" }}
            >
              {isEditMode ? "Discard changes" : "Discard"}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={creating || loadingCategories || loadingProduct || uploadingImage}
              sx={{ textTransform: "none", fontWeight: 800, bgcolor: accent, boxShadow: "none", "&:hover": { bgcolor: "#8f723c", boxShadow: "0 6px 18px rgba(171, 138, 72, 0.35)" } }}
            >
              {creating
                ? isEditMode
                  ? stagingFiles.length
                    ? "Saving & uploading images..."
                    : "Saving..."
                  : stagingFiles.length
                    ? "Creating & uploading images..."
                    : "Creating..."
                : isEditMode
                  ? "Save changes"
                  : "Create Product"}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminProductCreate;
