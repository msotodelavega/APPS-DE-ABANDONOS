window.APP_CONFIG = {
  appName: "Control de Abandonos Legales",
  dataMode: "mock",
  currentUser: {
    initials: "JD",
    name: "Juan Diaz",
    role: "ADMINISTRADOR"
  },
  roleProfiles: {
    ADMINISTRADOR: ["Juan Diaz"],
    COORDINADOR_RC: ["Coordinador RC"],
    RECONOCEDOR_RC: [
      "Carlos Restrepo",
      "Marta Gomez",
      "R. Mendez",
      "Sandra Vega"
    ],
    COORDINADOR_LOGISTICA: ["Coordinador Logistica"],
    RECONOCEDOR_LOGISTICA: [
      "Maria Giraldo",
      "Luis Herrera",
      "J. Herrera",
      "Paola Cardenas"
    ]
  },
  responsablesRC: [
    "Carlos Restrepo",
    "Marta Gomez",
    "R. Mendez",
    "Sandra Vega"
  ],
  responsablesLogistica: [
    "Maria Giraldo",
    "Luis Herrera",
    "J. Herrera",
    "Paola Cardenas"
  ],
  sharePoint: {
    siteUrl: "",
    listAbandonos: "ABANDONOS",
    listGestionRegistro: "GESTION_REGISTRO",
    listGestionLogistica: "GESTION_LOGISTICA"
  }
};
