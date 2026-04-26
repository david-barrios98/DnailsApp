import { createRouter, createWebHistory } from "@ionic/vue-router";
import type { RouteLocationNormalized, RouteRecordRaw } from "vue-router";
import TabsPage from "../views/TabsPage.vue";
import { getToken } from "@/services/api";

const routes: Array<RouteRecordRaw> = [
  { path: "/", redirect: "/tabs/citas" },
  { path: "/login", name: "login", component: () => import("@/views/LoginPage.vue"), meta: { public: true } },
  {
    path: "/tabs/",
    component: TabsPage,
    children: [
      { path: "", redirect: "/tabs/citas" },
      { path: "citas", name: "citas", component: () => import("@/views/AppointmentsPage.vue") },
      { path: "cuenta", name: "cuenta", component: () => import("@/views/AccountPage.vue") },
    ],
  },
  {
    path: "/appointment/:id",
    name: "appointmentDetail",
    component: () => import("@/views/AppointmentDetailPage.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

function needsAuth(to: RouteLocationNormalized): boolean {
  if (to.name === "login" || to.meta?.public) return false;
  return true;
}

router.beforeEach((to) => {
  const token = getToken();
  if (to.name === "login" && token) {
    return { path: "/tabs/citas" };
  }
  if (needsAuth(to) && !token) {
    return { path: "/login" };
  }
  return true;
});

export default router;
