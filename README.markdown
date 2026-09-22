# My yoga page

Página de yoga (creada originalmente en [CodePen](https://codepen.io/gabi-arn-/pen/WNEKNap)) con una
**app de clases guiadas** en [`/app`](app/).

## App de yoga guiada

- **Clases narradas por voz** en español, generadas a medida: 10, 20, 30, 45 o 60 minutos.
- **Nivel** (principiante / intermedio) y **zonas a cuidar** (rodillas, lumbares, muñecas,
  equilibrio): se evitan las posturas que puedan molestar.
- **Corrección de postura con la cámara**: cuando mantienes una postura sin moverte, analiza los
  ángulos de tu cuerpo, te da una indicación por voz (una cada vez, empezando por la más
  importante) y te felicita cuando la corriges. El vídeo se procesa **en tu dispositivo** con
  [MediaPipe Pose](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) y nunca se envía.
- **Música de relajación** generada en tiempo real (ambiente o cuencos tibetanos) o tu propio archivo;
  baja de volumen automáticamente cuando habla el narrador.
- Comprobación del encuadre al empezar, esqueleto superpuesto (verde = bien, naranja = ajustar),
  animación de respiración, pausa / saltar postura, pantalla siempre encendida e historial con racha de días.

### Posturas con corrección

Montaña, Silla, Guerrero I, Guerrero II, Triángulo, Árbol, Guerrero III, Perro boca abajo, Puente y
Cobra. El resto de posturas se narran sin corrección.

### Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173/app/
npm test           # tests unitarios (secuencias, reglas de corrección, coach…)
npm run build      # genera dist/
```

La cámara necesita HTTPS (o `localhost`). La app se despliega en GitHub Pages con el workflow
`.github/workflows/deploy.yml` al hacer push a `main` (hay que activarlo en *Settings → Pages →
Source: GitHub Actions*).

### Estructura

| Archivo | Qué hace |
|---|---|
| `app/src/poses.ts` | Biblioteca de posturas y textos de narración |
| `app/src/sequencer.ts` | Genera la clase según duración, nivel y zonas a cuidar |
| `app/src/session.ts` | Motor de la clase: narración, tiempos, pausa, saltar |
| `app/src/narrator.ts` | Voz (Web Speech API) |
| `app/src/music.ts` | Música generativa y *ducking* |
| `app/src/camera.ts` | Cámara + MediaPipe + dibujo del esqueleto |
| `app/src/stillness.ts` | Detecta cuándo dejas de moverte |
| `app/src/corrections.ts` | Reglas de alineación por postura |
| `app/src/coach.ts` | Decide qué corrección decir y cuándo |
| `app/src/framing.ts` | Comprobación del encuadre |
