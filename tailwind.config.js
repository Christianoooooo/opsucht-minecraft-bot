module.exports = {
  content: ["./src/**/*.{html,js}"], // Scan nach Dateien in src/
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Setze Inter Var als Standard-Schriftart
      },
    },
  },
  plugins: [require("daisyui")], // DaisyUI Plugin aktivieren
};
