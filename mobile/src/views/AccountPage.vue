<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Cuenta</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list v-if="user" :inset="true" lines="full">
        <ion-item>
          <ion-label>
            <p>Nombre</p>
            <h2>{{ user.fullName }}</h2>
          </ion-label>
        </ion-item>
        <ion-item v-if="user.phoneE164">
          <ion-label>
            <p>Teléfono</p>
            <h2>{{ user.phoneE164 }}</h2>
          </ion-label>
        </ion-item>
        <ion-item v-if="user.email && !isSyntheticEmail(user.email)">
          <ion-label>
            <p>Correo</p>
            <h2>{{ user.email }}</h2>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <p>Roles</p>
            <h2>{{ user.roles.join(", ") }}</h2>
          </ion-label>
        </ion-item>
      </ion-list>
      <p v-else class="ion-text-center ion-padding">Cargando perfil…</p>

      <ion-button expand="block" color="medium" class="ion-margin-top" @click="logout">Cerrar sesión</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar } from "@ionic/vue";
import { meRequest, setToken } from "@/services/api";
import type { AuthUser } from "@/types/api";

function isSyntheticEmail(email: string) {
  return email.endsWith("@phone.dnails.local");
}

const router = useRouter();
const user = ref<AuthUser | null>(null);

onMounted(async () => {
  try {
    const r = await meRequest();
    user.value = r.user;
  } catch {
    user.value = null;
  }
});

async function logout() {
  setToken(null);
  await router.replace("/login");
}
</script>
