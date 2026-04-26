<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="citas" href="/tabs/citas">
          <ion-icon aria-hidden="true" :icon="calendar" />
          <ion-label>Citas</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="cuenta" href="/tabs/cuenta">
          <ion-icon aria-hidden="true" :icon="person" />
          <ion-label>Cuenta</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonIcon, IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from "@ionic/vue";
import { calendar, person } from "ionicons/icons";
</script>
