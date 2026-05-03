import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";

const accent = "#ab8a48";
const pageBg = "#ffffff";
const STATUS_OPTIONS = ["draft", "published", "archived"];
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const FABRIC_OPTIONS = ["Cotton", "Linen", "Silk", "Organic Cotton", "Other"];
const SECTIONS = ["Basic Info", "Pricing", "SEO", "Variants"];

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

function getCreateErrorMessage(error) {
  const rawMessage = error?.response?.data?.message || error?.message || "";
  if (!rawMessage) return "Failed to create product.";

  if (rawMessage.toLowerCase().includes("invalid enum value")) {
    return `Please select a valid fabric: ${FABRIC_OPTIONS.join(", ")}.`;
  }

  return rawMessage;
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

async function uploadProductImageToS3(uploadUrl, file) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!response.ok) {
    throw new Error("Failed to upload image to S3.");
  }
  return true;
}

async function confirmProductImageUpload(productId, payload) {
  const { data } = await client.post(`/admin/products/${productId}/image-confirm`, payload);
  return normalizeProductPayload(data);
}

async function deleteProductImage(productId, key) {
  const encodedKey = encodeURIComponent(key);
  const { data } = await client.delete(`/admin/products/${productId}/images/${encodedKey}`);
  return data?.data !== undefined ? data.data : data;
}

const AdminProductCreate = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");

  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [creating, setCreating] = useState(false);
  const [createdProductId, setCreatedProductId] = useState("");
  const [productImages, setProductImages] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imageDisplayOrder, setImageDisplayOrder] = useState(0);
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

  const onFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setImageError("");
    setImageSuccess("");

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

    setCreating(true);
    try {
      const { data } = await client.post("/admin/products", payload);
      const created = normalizeProductPayload(data);
      const id = pickProductId(created);
      const slug = created?.slug ? String(created.slug) : "";
      setSuccess(`Product created${id ? ` (id: ${id})` : ""}${slug ? ` (slug: ${slug})` : ""}.`);
      setCreatedProductId(id ? String(id) : "");
      const nextImages = normalizeProductImages(created);
      setProductImages(nextImages);
      setImageDisplayOrder(nextImages.length);
    } catch (e) {
      setError(getCreateErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const handleUploadImage = async () => {
    if (!createdProductId) {
      setImageError("Create the product first, then upload images.");
      return;
    }
    if (!imageFile) {
      setImageError("Choose an image file before uploading.");
      return;
    }

    setImageError("");
    setImageSuccess("");
    setUploadingImage(true);

    try {
      const uploadPayload = {
        contentType: imageFile.type || "application/octet-stream",
        fileName: imageFile.name || `product-image-${Date.now()}.jpg`,
      };
      const uploadData = await getProductImageUploadUrl(createdProductId, uploadPayload);
      const uploadUrl = uploadData?.uploadUrl;
      const key = uploadData?.key;

      if (!uploadUrl || !key) {
        throw new Error("Upload URL response is missing uploadUrl or key.");
      }

      await uploadProductImageToS3(uploadUrl, imageFile);
      const updatedProduct = await confirmProductImageUpload(createdProductId, {
        key,
        displayOrder: Number(imageDisplayOrder),
      });

      const nextImages = normalizeProductImages(updatedProduct);
      setProductImages(nextImages);
      setImageDisplayOrder(nextImages.length);
      setImageFile(null);
      setImageSuccess("Image uploaded and confirmed successfully.");
    } catch (e) {
      setImageError(e?.response?.data?.message || e?.message || "Failed to upload image.");
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
      setImageDisplayOrder(nextImages.length);
      setImageSuccess("Image deleted.");
    } catch (e) {
      setImageError(e?.response?.data?.message || e?.message || "Failed to delete image.");
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
            { label: "Create Product" },
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
              Create Product
            </Typography>
            <Typography variant="body2" sx={{ color: "#5a6761" }}>
              Fill all fields in one form and create product quickly.
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
                {STATUS_OPTIONS.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField label="Tags (comma separated)" fullWidth size="small" value={form.tags} onChange={(e) => onFormChange("tags", e.target.value)} />

            <TextField label="Regular Price" type="number" fullWidth size="small" value={form.regularPrice} onChange={(e) => onFormChange("regularPrice", e.target.value)} required />

            <TextField label="Discount Price" type="number" fullWidth size="small" value={form.discountPrice} onChange={(e) => onFormChange("discountPrice", e.target.value)} required />

            <TextField label="Tax Percent" type="number" fullWidth size="small" value={form.taxPercent} onChange={(e) => onFormChange("taxPercent", e.target.value)} />

            <TextField label="SEO Meta Title" fullWidth size="small" value={form.metaTitle} onChange={(e) => onFormChange("metaTitle", e.target.value)} />

            <TextField label="SEO Meta Description" fullWidth size="small" value={form.metaDescription} onChange={(e) => onFormChange("metaDescription", e.target.value)} />
          </Stack>

          <Box sx={{ mt: 2.5 }}>
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

          {createdProductId ? (
            <Box sx={{ mt: 2.5 }}>
              <Typography sx={{ mb: 1.1, fontWeight: 800, color: "#1f2a24" }}>Product Images (S3)</Typography>
              <Typography variant="body2" sx={{ mb: 1.2, color: "#5a6761" }}>
                Choose an image, upload via presigned URL, and confirm automatically.
              </Typography>
              <Stack spacing={1.2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                  <Button variant="outlined" component="label" sx={{ textTransform: "none", borderColor: alpha("#0f3828", 0.2), color: "#1f2a24" }}>
                    {imageFile ? `Selected: ${imageFile.name}` : "Choose Image"}
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setImageFile(file);
                      }}
                    />
                  </Button>
                  <TextField
                    label="Display Order"
                    type="number"
                    size="small"
                    value={imageDisplayOrder}
                    onChange={(e) => setImageDisplayOrder(Number(e.target.value))}
                    sx={{ width: { xs: "100%", sm: 180 } }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleUploadImage}
                    disabled={uploadingImage}
                    sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, boxShadow: "none", "&:hover": { bgcolor: "#8f723c" } }}
                  >
                    {uploadingImage ? "Uploading..." : "Upload & Confirm"}
                  </Button>
                </Stack>
                {productImages.length ? (
                  <Stack spacing={1}>
                    {productImages.map((image) => (
                      <Paper
                        key={image.key}
                        elevation={0}
                        sx={{ p: 1.2, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.12)}`, bgcolor: "#fcfcfc" }}
                      >
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
                          <Box>
                            <Typography variant="body2" sx={{ color: "#2a4135", fontWeight: 700 }}>
                              Order: {image.displayOrder}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#5a6761", wordBreak: "break-all" }}>
                              {image.key}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            {image.url ? (
                              <Button size="small" variant="outlined" component="a" href={image.url} target="_blank" rel="noreferrer" sx={{ textTransform: "none" }}>
                                Open
                              </Button>
                            ) : null}
                            <Button size="small" color="error" variant="text" onClick={() => handleDeleteImage(image.key)} sx={{ textTransform: "none" }}>
                              Delete
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

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate("/admin/products")} sx={{ textTransform: "none", fontWeight: 700, borderColor: alpha("#0f3828", 0.25), color: "#1f2a24" }}>
              Back to Products
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={creating || loadingCategories}
              sx={{ textTransform: "none", fontWeight: 800, bgcolor: accent, boxShadow: "none", "&:hover": { bgcolor: "#8f723c", boxShadow: "0 6px 18px rgba(171, 138, 72, 0.35)" } }}
            >
              {creating ? "Creating..." : "Create Product"}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminProductCreate;
