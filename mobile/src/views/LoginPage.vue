<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>DNAILS — Acceso</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <form @submit.prevent="submit">
        <ion-list :inset="true" lines="full">
          <ion-item>
            <ion-input
              v-model="phone"
              label="Teléfono"
              label-placement="stacked"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              required
            />
          </ion-item>
          <ion-item>
            <ion-input
              v-model="password"
              label="Contraseña"
              label-placement="stacked"
              type="password"
              autocomplete="current-password"
              required
            />
          </ion-item>
        </ion-list>
        <ion-button expand="block" type="submit" :disabled="loading" class="ion-margin-top">
          Entrar
        </ion-button>
        <ion-button expand="block" fill="clear" class="ion-margin-top" :disabled="loading" @click="enterDemo">
          Ver app en modo demostración (sin conexión al servidor)
        </ion-button>
        <p v-if="err" class="ion-text-center ion-padding-top" color="danger" style="color: var(--ion-color-danger)">
          {{ err }}
        </p>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { DEMO_UI_TOKEN, loginRequest, setToken } from "@/services/api";

const router = useRouter();
const phone = ref("");
const password = ref("");
const loading = ref(false);
const err = ref("");

async function submit() {
  err.value = "";
  loading.value = true;
  try {
    const r = await loginRequest(phone.value.trim(), password.value);
    setToken(r.token);
    await router.replace("/tabs/citas");
  } catch (e) {
    err.value = e instanceof Error ? e.message : "Error al iniciar sesión";
  } finally {
    loading.value = false;
  }
}

function enterDemo() {
  err.value = "";
  setToken(DEMO_UI_TOKEN);
  void router.replace("/tabs/citas");
}
</script>
