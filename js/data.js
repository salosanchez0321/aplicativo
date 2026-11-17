/* ==========================================================================
   DATOS SIMULADOS
   --------------------------------------------------------------------------
   Toda la información que muestra la maqueta vive aquí. Para conectar un
   backend real, reemplaza este objeto por respuestas de tu API manteniendo
   la misma forma (mismos nombres de campos).
   Montos en pesos colombianos (COP). Fechas relativas a "hoy" para que la
   demo siempre se vea actual.
   ========================================================================== */
(function () {
  "use strict";

  /** Devuelve una fecha ISO de hace N días (a una hora dada). */
  function daysAgo(n, hour) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour || 22, 0, 0, 0);
    return d.toISOString();
  }

  /** Próximo viernes a las 22:00 (para la reserva de ejemplo). */
  function nextFriday() {
    var d = new Date();
    var diff = (5 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(22, 0, 0, 0);
    return d.toISOString();
  }

  window.AE_DATA = {
    user: {
      firstName: "Morgana",
      fullName: "Morgana Valdés",
      handle: "@morgana.v",
      email: "morgana@covenbar.co",
      birth: "1998-10-31",
      memberId: "0313",
      memberSince: "2025",
      level: "Iniciada",
      nextLevel: "Hechicera",
      points: 2480,
      nextLevelAt: 4000
    },

    /* Cuentas = "Grimorio". cat define color e icono (ver CATEGORIES). */
    accounts: [
      { id: "monedero", name: "Monedero del Coven", number: "•••• 1313", balance: 186500, icon: "wallet", cat: "recarga" },
      { id: "esencia",  name: "Bolsa de Esencia",   number: "2.480 pts · $10 c/u", balance: 24800, icon: "spark", cat: "elixir" },
      { id: "regalo",   name: "Tarjeta regalo Luna Llena", number: "Vence en 60 días", balance: 60000, icon: "gift", cat: "regalo" }
    ],

    /* Variación del saldo total: últimas 8 semanas (para la sparkline) */
    trend: [168000, 175000, 152000, 198000, 210000, 189000, 236000, 271300],
    trendPercent: 12.4,

    /* Categorías de movimiento → etiqueta + icono del sprite */
    categories: {
      elixir:  { label: "Elixires",  icon: "glass" },
      pocion:  { label: "Pociones",  icon: "flask" },
      ritual:  { label: "Rituales",  icon: "tarot" },
      merch:   { label: "Tienda",    icon: "bag" },
      regalo:  { label: "Regalos",   icon: "gift" },
      recarga: { label: "Recargas",  icon: "plus" }
    },

    /* Movimientos: amount negativo = consumo, positivo = ingreso */
    transactions: [
      { id: "t1",  title: "Sangre de Luna ×2",           cat: "elixir",  amount: -96000,  date: daysAgo(1, 23),  account: "monedero" },
      { id: "t2",  title: "Lectura de Tarot · Arcano XIII", cat: "ritual", amount: -65000, date: daysAgo(1, 22),  account: "monedero" },
      { id: "t3",  title: "Recarga desde Visa •••• 4521", cat: "recarga", amount: 200000, date: daysAgo(3, 18),  account: "monedero" },
      { id: "t4",  title: "Poción del Bosque (sin alcohol)", cat: "pocion", amount: -28000, date: daysAgo(6, 21), account: "monedero" },
      { id: "t5",  title: "Vela ritual de obsidiana",     cat: "merch",   amount: -42000,  date: daysAgo(8, 20),  account: "monedero" },
      { id: "t6",  title: "Regalo recibido de @lilith.noir", cat: "regalo", amount: 60000, date: daysAgo(10, 15), account: "regalo" },
      { id: "t7",  title: "Absenta Verde Hada",           cat: "elixir",  amount: -44000,  date: daysAgo(13, 23), account: "monedero" },
      { id: "t8",  title: "Ritual de humo · Palo santo",  cat: "ritual",  amount: -35000,  date: daysAgo(16, 22), account: "monedero" },
      { id: "t9",  title: "Elixir Ojo de Cuervo",         cat: "elixir",  amount: -46000,  date: daysAgo(20, 22), account: "monedero" },
      { id: "t10", title: "Esencia ganada por consumos",  cat: "recarga", amount: 12400,   date: daysAgo(22, 12), account: "esencia" },
      { id: "t11", title: "Poción Lavanda Nocturna",      cat: "pocion",  amount: -26000,  date: daysAgo(25, 21), account: "monedero" }
    ],

    /* Experiencias reservables (deposit = abono que se descuenta) */
    experiences: [
      { id: "altar",  name: "Mesa en el Altar · coctelería libre", deposit: 30000 },
      { id: "tarot",  name: "Lectura de Tarot + 2 elixires",       deposit: 90000 },
      { id: "absenta", name: "Cata de absenta · 4 pasos",          deposit: 75000 },
      { id: "luna",   name: "Ritual de Luna Llena (grupal)",       deposit: 120000 }
    ],

    nextReservation: { date: nextFriday(), experience: "Lectura de Tarot + 2 elixires", guests: 3, table: "Altar Norte" },

    /* Carta (cat: autor | sin-alcohol | ritual). catClass reutiliza colores. */
    menu: [
      { id: "m1", name: "Sangre de Luna",  cat: "autor",       catClass: "elixir", tag: "Elixir de autor",  price: 48000, img: "img/hero.jpg",           alt: "Cóctel rojo humeante en copa tallada", desc: "Gin de saúco, granada ahumada, bitter de rosa y humo de palo santo." },
      { id: "m2", name: "Verde Hada",      cat: "autor",       catClass: "pocion", tag: "Elixir de autor",  price: 44000, img: "img/elixir-absenta.jpg", alt: "Absenta verde con terrón de azúcar en cuchara ornamentada", desc: "Absenta tradicional, azúcar flameada y agua helada gota a gota." },
      { id: "m3", name: "Medianoche Negra", cat: "autor",      catClass: "ritual", tag: "Elixir de autor",  price: 52000, img: "img/elixir-luna.jpg",    alt: "Cóctel morado oscuro con oro comestible y rosa seca", desc: "Ron negro, mora, carbón activado, pan de oro y rosa deshidratada." },
      { id: "m4", name: "Poción del Bosque", cat: "sin-alcohol", catClass: "pocion", tag: "Sin alcohol",    price: 28000, img: "img/elixir-absenta.jpg", alt: "Bebida verde en copa de cristal", desc: "Pepino, albahaca, té matcha y tónica de flor de sauco." },
      { id: "m5", name: "Lavanda Nocturna", cat: "sin-alcohol", catClass: "ritual", tag: "Sin alcohol",    price: 26000, img: "img/elixir-luna.jpg",    alt: "Bebida violeta con rosa", desc: "Infusión de lavanda, mora azul, limón y espuma de aquafaba." },
      { id: "m6", name: "Lectura de Tarot", cat: "ritual",      catClass: "elixir", tag: "Ritual · 20 min", price: 65000, img: "img/ritual-tarot.jpg",   alt: "Cartas de tarot sobre terciopelo negro con velas", desc: "Tirada de tres arcanos en tu mesa con nuestra vidente residente." }
    ],

    tableNumber: 7,
    contacts: ["@lilith.noir", "@hexe_ana", "@cuervo.dani", "@sibila.rosa"]
  };
})();
