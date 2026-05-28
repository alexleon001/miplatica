// Confirmación de borrado reutilizable (Alert nativo con acción destructiva).

import { Alert } from "react-native";

export function confirmDelete(label: string, onConfirm: () => void) {
  Alert.alert(
    "Borrar",
    `¿Seguro que querés borrar "${label}"? No se puede deshacer.`,
    [
      { text: "Cancelar", style: "cancel" },
      { text: "Borrar", style: "destructive", onPress: onConfirm },
    ],
  );
}
