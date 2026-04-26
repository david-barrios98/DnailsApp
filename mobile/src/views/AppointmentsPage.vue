<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Citas</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="load($event)">
        <ion-refresher-content />
      </ion-refresher>

      <ion-segment v-model="filterStatus" @ion-change="onSegmentChange" class="ion-padding-horizontal ion-padding-top">
        <ion-segment-button value="all">
          <ion-label>Todas</ion-label>
        </ion-segment-button>
        <ion-segment-button v-for="s in mainStatuses" :key="s" :value="s">
          <ion-label>{{ shortLabel(s) }}</ion-label>
        </ion-segment-button>
      </ion-segment>

      <p v-if="errorMsg" class="ion-padding ion-text-center" style="color: var(--ion-color-danger)">{{ errorMsg }}</p>

      <ion-list v-if="items.length">
        <ion-item
          v-for="a in items"
          :key="a.id"
          button
          :detail="true"
          @click="open(a.id)"
        >
          <ion-label>
            <h2>{{ a.customer?.fullName ?? "Cliente" }}</h2>
            <p>
              <ion-badge :color="badgeColor(a.status)">{{ statusLabel(a.status) }}</ion-badge>
              <span v-if="whenText(a)" class="ion-margin-start">{{ whenText(a) }}</span>
            </p>
            <p v-if="a.leadPhoneE164" class="ion-text-wrap">{{ a.leadPhoneE164 }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <div v-else-if="!loading" class="ion-padding ion-text-center">No hay citas con este filtro.</div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  IonBadge,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { listAppointments } from "@/services/api";
import type { Appointment, AppointmentStatus } from "@/types/api";
import { statusLabel } from "@/utils/status";

const router = useRouter();
const items = ref<Appointment[]>([]);
const loading = ref(true);
const errorMsg = ref("");
const filterStatus = ref<string>("all");

const mainStatuses: AppointmentStatus[] = ["PENDING", "CONFIRMED", "IN_SERVICE", "COMPLETED"];

function shortLabel(s: AppointmentStatus): string {
  if (s === "PENDING") return "Pend.";
  if (s === "CONFIRMED") return "Conf.";
  if (s === "IN_SERVICE") return "Serv.";
  if (s === "COMPLETED") return "Listo";
  return statusLabel(s);
}

function badgeColor(st: AppointmentStatus): string {
  switch (st) {
    case "PENDING":
      return "warning";
    case "CONFIRMED":
    case "IN_ROUTE":
      return "primary";
    case "IN_SERVICE":
      return "tertiary";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
    case "NO_SHOW":
      return "medium";
    default:
      return "medium";
  }
}

function whenText(a: Appointment): string {
  const raw = a.startAt ?? a.requestedStartAt;
  if (!raw) return a.requestedTimeText || "";
  try {
    return new Date(raw).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

function open(id: number) {
  void router.push(`/appointment/${id}`);
}

async function load(ev?: CustomEvent) {
  errorMsg.value = "";
  loading.value = true;
  try {
    const { appointments } = await listAppointments({
      status: filterStatus.value === "all" ? undefined : filterStatus.value,
    });
    items.value = appointments;
  } catch (e) {
    if (e instanceof Error && (e as Error & { code?: string }).code === "UNAUTHORIZED") {
      await router.replace("/login");
    } else {
      errorMsg.value = e instanceof Error ? e.message : "Error al cargar";
    }
  } finally {
    loading.value = false;
    const t = ev?.target as { complete?: () => void } | undefined;
    t?.complete?.();
  }
}

function onSegmentChange() {
  void load();
}

onMounted(() => {
  void load();
});
</script>
