import { Route, Routes } from "react-router-dom";
import AdminDashboard from "../Admin/pages/Dashboard";
import AdminOrderDetail from "../Admin/pages/AdminOrderDetail";
import AdminOrders from "../Admin/pages/AdminOrders";
import AdminReturnDetail from "../Admin/pages/AdminReturnDetail";
import AdminReturns from "../Admin/pages/AdminReturns";
import AdminUserDetail from "../Admin/pages/AdminUserDetail";
import AdminUserEdit from "../Admin/pages/AdminUserEdit";
import AdminUsers from "../Admin/pages/AdminUsers";
import AdminProducts from "../Admin/pages/AdminProducts";
import AdminProductCreate from "../Admin/pages/AdminProductCreate";
import AdminProductDetail from "../Admin/pages/AdminProductDetail";
import AdminBanners from "../Admin/pages/AdminBanners";
import AdminBannerList from "../Admin/pages/AdminBannerList";
import AdminBannerDetail from "../Admin/pages/AdminBannerDetail";
import AdminBannerImages from "../Admin/pages/AdminBannerImages";
import AdminHomepageCMS from "../Admin/pages/AdminHomepageCMS";
import AdminSectionDetail from "../Admin/pages/AdminSectionDetail";
import AdminSections from "../Admin/pages/AdminSections";
import AdminProductListSections from "../Admin/pages/AdminProductListSections";
import AdminCategoryGridSections from "../Admin/pages/AdminCategoryGridSections";
import AdminProductListSectionDetail from "../Admin/pages/AdminProductListSectionDetail";
import AdminCategoryGridSectionDetail from "../Admin/pages/AdminCategoryGridSectionDetail";
import AdminProductListSectionCreate from "../Admin/pages/AdminProductListSectionCreate";
import AdminProductListSectionEdit from "../Admin/pages/AdminProductListSectionEdit";
import AdminCategoryGridSectionCreate from "../Admin/pages/AdminCategoryGridSectionCreate";
import AdminCategoryGridSectionEdit from "../Admin/pages/AdminCategoryGridSectionEdit";
import AdminCategories from "../Admin/pages/AdminCategories";
import AdminCategoryCreate from "../Admin/pages/AdminCategoryCreate";
import AdminCategoryDetail from "../Admin/pages/AdminCategoryDetail";
import AdminCategoryEdit from "../Admin/pages/AdminCategoryEdit";
import AnalyticsDashboard from "../Admin/pages/analytics/AnalyticsDashboard";
import CustomersAnalyticsPage from "../Admin/pages/analytics/CustomersAnalyticsPage";
import InventoryAnalyticsPage from "../Admin/pages/analytics/InventoryAnalyticsPage";
import OrdersAnalyticsPage from "../Admin/pages/analytics/OrdersAnalyticsPage";
import ReturnsAnalyticsPage from "../Admin/pages/analytics/ReturnsAnalyticsPage";
import RevenueAnalyticsPage from "../Admin/pages/analytics/RevenueAnalyticsPage";
import TopProductsAnalyticsPage from "../Admin/pages/analytics/TopProductsAnalyticsPage";
import CustomerLayout from "../Customers/components/CustomerLayout";
import AddressForm from "../Customers/Pages/AddressForm";
import AddressList from "../Customers/Pages/AddressList";
import ChangePassword from "../Customers/Pages/ChangePassword";
import Forgetpassword from "../Customers/Pages/Forgetpassword";
import CategoryDetail from "../Customers/Pages/CategoryDetail";
import Home from "../Customers/Pages/Home";
import Login from "../Customers/Pages/Login";
import Profile from "../Customers/Pages/Profile";
import Resetpassword from "../Customers/Pages/Resetpassword";
import Signup from "../Customers/Pages/Signup";
import ProtectedRoute from "./ProtectedRoute";
import ShopByCategoryPage from "../Customers/Pages/ShopByCategoryPage";
import Products from "../Customers/Pages/Products";
import ProductDetail from "../Customers/Pages/ProductDetail";
import Cart from "../Customers/Pages/Cart";
import Checkout from "../Customers/Pages/Checkout";
import OrderDetail from "../Customers/Pages/OrderDetail";
import OrdersList from "../Customers/Pages/OrdersList";
import Wishlist from "../Customers/Pages/Wishlist";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/categories" element={<ShopByCategoryPage />} />
        <Route path="/categories/:slug" element={<CategoryDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgetpassword" element={<Forgetpassword />} />
        <Route path="/resetpassword" element={<Resetpassword />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/change-password" element={<ChangePassword />} />
          <Route path="/profile/addresses" element={<AddressList />} />
          <Route path="/profile/addresses/new" element={<AddressForm />} />
          <Route path="/profile/addresses/:addressId/edit" element={<AddressForm />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<OrdersList />} />
          <Route path="/orders/:orderNumber" element={<OrderDetail />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["super_admin", "manager"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/products/create" element={<AdminProductCreate />} />
        <Route path="/admin/products/:productId/edit" element={<AdminProductCreate />} />
        <Route path="/admin/products/:productId" element={<AdminProductDetail />} />
        <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
        <Route path="/admin/users/:userId/edit" element={<AdminUserEdit />} />
        <Route path="/admin/homepage-cms" element={<AdminHomepageCMS />} />
        <Route path="/admin/homepage-cms/banners" element={<AdminBannerList />} />
        <Route path="/admin/homepage-cms/create" element={<AdminBanners />} />
        <Route path="/admin/homepage-cms/sections" element={<AdminSections />} />
        <Route path="/admin/homepage-cms/sections/:sectionId" element={<AdminSectionDetail />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/categories/create" element={<AdminCategoryCreate />} />
        <Route path="/admin/categories/:categoryId" element={<AdminCategoryDetail />} />
        <Route path="/admin/categories/:categoryId/edit" element={<AdminCategoryEdit />} />
        <Route path="/admin/homepage-cms/product-list-sections" element={<AdminProductListSections />} />
        <Route path="/admin/homepage-cms/product-list-sections/create" element={<AdminProductListSectionCreate />} />
        <Route path="/admin/homepage-cms/product-list-sections/:sectionId" element={<AdminProductListSectionDetail />} />
        <Route path="/admin/homepage-cms/product-list-sections/:sectionId/edit" element={<AdminProductListSectionEdit />} />
        <Route path="/admin/homepage-cms/category-grid-sections" element={<AdminCategoryGridSections />} />
        <Route path="/admin/homepage-cms/category-grid-sections/create" element={<AdminCategoryGridSectionCreate />} />
        <Route path="/admin/homepage-cms/category-grid-sections/:sectionId" element={<AdminCategoryGridSectionDetail />} />
        <Route path="/admin/homepage-cms/category-grid-sections/:sectionId/edit" element={<AdminCategoryGridSectionEdit />} />
        <Route path="/admin/homepage-cms/:bannerId" element={<AdminBannerDetail />} />
        <Route path="/admin/homepage-cms/:bannerId/images" element={<AdminBannerImages />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["super_admin", "manager", "support_staff"]} />}>
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/orders/:orderNumber" element={<AdminOrderDetail />} />
        <Route path="/admin/returns" element={<AdminReturns />} />
        <Route path="/admin/returns/:returnNumber" element={<AdminReturnDetail />} />
        <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
        <Route path="/admin/analytics/revenue" element={<RevenueAnalyticsPage />} />
        <Route path="/admin/analytics/top-products" element={<TopProductsAnalyticsPage />} />
        <Route path="/admin/analytics/orders" element={<OrdersAnalyticsPage />} />
        <Route path="/admin/analytics/customers" element={<CustomersAnalyticsPage />} />
        <Route path="/admin/analytics/inventory" element={<InventoryAnalyticsPage />} />
        <Route path="/admin/analytics/returns" element={<ReturnsAnalyticsPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;