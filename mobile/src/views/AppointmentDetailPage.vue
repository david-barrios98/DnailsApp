<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/citas" />
        </ion-buttons>
        <ion-title>Cita #{{ id }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content v-if="appt" class="ion-padding">
      <ion-card v-if="err" color="danger">
        <ion-card-content>{{ err }}</ion-card-content>
      </ion-card>

      <ion-list :inset="true" lines="none">
        <ion-item>
          <ion-select
            label="Estado"
            label-placement="stacked"
            :value="appt?.status"
            :disabled="!canEdit"
            interface="action-sheet"
            :interface-options="{ header: 'Cambiar estado' }"
            @ionChange="onStatusPick"
          >
            <ion-select-option v-for="s in ALL_STATUSES" :key="s" :value="s">
              {{ statusLabel(s) }}
            </ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item v-if="!canEdit" lines="none">
          <ion-label class="ion-text-wrap">
            <p class="ion-text-color-medium">Solo lectura. Tu rol no permite editar estados (VIEWER).</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-card v-if="appt.customer">
        <ion-card-header>
          <ion-card-title>Cliente</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p><strong>Nombre:</strong> {{ appt.customer.fullName }}</p>
          <p v-if="appt.customer.phoneE164"><strong>Tel:</strong> {{ appt.customer.phoneE164 }}</p>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="appt.leadName || appt.leadPhoneE164">
        <ion-card-header>
          <ion-card-title>Quien agenda (lead)</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p v-if="appt.leadName">{{ appt.leadName }}</p>
          <p v-if="appt.leadPhoneE164">{{ appt.leadPhoneE164 }}</p>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="appt.address">
        <ion-card-header>
          <ion-card-title>Dirección</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p class="ion-text-wrap">{{ appt.address.line1 }}</p>
          <p v-if="appt.address.neighborhood">
            {{ appt.address.neighborhood.locality }} — {{ appt.address.neighborhood.name }}
          </p>
          <ion-button
            v-if="appt.address.mapsUrl"
            fill="outline"
            size="small"
            :href="appt.address.mapsUrl"
            target="_blank"
            rel="noopener"
          >
            Abrir en Maps
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Horario</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p v-if="appt.startAt">Inicio: {{ fmt(appt.startAt) }}</p>
          <p v-else-if="appt.requestedStartAt">Solicitado: {{ fmt(appt.requestedStartAt) }}</p>
          <p v-if="appt.requestedTimeText && !appt.startAt">Texto: {{ appt.requestedTimeText }}</p>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="appt.plannedServices?.length">
        <ion-card-header>
          <ion-card-title>Servicios planeados</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p v-for="p in appt.plannedServices" :key="p.id" class="ion-text-wrap">
            {{ p.service.category.name }} — {{ p.service.name }} (×{{ p.quantity }})
          </p>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="appt.notes">
        <ion-card-header>
          <ion-card-title>Notas</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p class="ion-text-wrap">{{ appt.notes }}</p>
        </ion-card-content>
      </ion-card>
    </ion-content>
    <ion-content v-else class="ion-padding">
      <p class="ion-text-center">{{ loadErr || "Cargando…" }}</p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { getAppointment, meRequest, updateAppointment } from "@/services/api";
import type { Appointment, AppointmentStatus } from "@/types/api";
import { ALL_STATUSES, statusLabel } from "@/utils/status";

const route = useRoute();
const router = useRouter();
const id = computed(() => Number(route.params.id));
const appt = ref<Appointment | null>(null);
const err = ref("");
const loadErr = ref("");
const roles = ref<string[]>([]);

const canEdit = computed(() => {
  return roles.value.some((r) => r === "OWNER" || r === "ADMIN" || r === "STAFF");
});

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

async function load() {
  appt.value = null;
  loadErr.value = "";
  err.value = "";
  try {
    const r = await getAppointment(id.value);
    appt.value = r.appointment;
  } catch (e) {
    if (e instanceof Error && (e as Error & { code?: string }).code === "UNAUTHORIZED") {
      await router.replace("/login");
    } else {
      loadErr.value = e instanceof Error ? e.message : "Error";
    }
  }
}

async function onStatusPick(ev: CustomEvent<{ value: AppointmentStatus }>) {
  if (!appt.value) return;
  if (!canEdit.value) return;
  const v = ev.detail.value;
  if (v === appt.value.status) return;
  err.value = "";
  try {
    const { appointment } = await updateAppointment(appt.value.id, { status: v });
    appt.value = appointment;
  } catch (e) {
    err.value = e instanceof Error ? e.message : "No se pudo actualizar (¿permisos?)";
  }
}

watch(
  () => route.params.id,
  () => {
    void load();
  },
);

onMounted(async () => {
  try {
    const m = await meRequest();
    roles.value = m.user?.roles ?? [];
  } catch {
    roles.value = [];
  }
  await load();
});
</script>
