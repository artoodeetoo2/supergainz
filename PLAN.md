# SuperGainz - Tekninen Spesifikaatio & Suunnitelma

**Tavoite**: Rakentaa mobiili-first skaalautuva kuntosalisovellus, jossa painotetaan 80's neon / Zyzz -estetiikkaa. Sovellus julkaistaan Firebaseen ja se hyödyntää tekoälyä asiantuntevan treenivastuksen luomiseen.

## 1. Teknologiapino (Tech Stack)
* **Frontend**: React (Vite) + TypeScript. Kevyt ja nopea, suunniteltu erityisesti mobiililaitteille.
* **Tyylitys**: Tailwind CSS v4.
  * *Estetiikka*: "80s Neon Retro Wave" (pinkki, syaani, purppura, pimeä tausta, hehkuvat reunat).
* **Backend / Tietokanta**: Firebase.
  * *Auth*: Google Authentication (Käyttäjäkohtainen kirjautuminen).
  * *Database*: Firestore. Jokainen käyttäjä näkee vain oman datansa (Security Rules).
  * *Hosting*: Firebase Hosting, johon Vite-build julkaistaan.
* **Tekoäly (AI)**: Anthropic Claude API (`claude-haiku-4-5-20251001`), kutsutaan frontendistä MVP-vaiheessa.

## 2. Pääominaisuudet & Näkymät

1. **Autentikaatio & Etusivu** ✅
   * Google sign-in, neon login-ruutu.
   * Login-sivu: `/zyzz.jpg` hero, random Zyzz-quote, "Login with Google" -nappi.
   * Sisäänkirjautuneelle: bottom nav + Home-näkymä.
   * Home: `/zyzz-character.jpg` hero-banner, ohjelmalista korteilla + START-nappi.

2. **Profiili (Profile)** ✅
   * Google-tilin nimi, kuva, sähköposti.
   * Sign Out -nappi.

3. **Ohjelmat ja Lihasryhmät (Programs)** ✅
   * Ohjelmalista Firestoresta (`users/{uid}/programs`).
   * **Load Defaults**: lataa 5 valmista ohjelmaa (Push/Pull/Legs/Upper/Lower).
   * **AI Suggest**: Claude ehdottaa 2 uutta ohjelmaa. Hyväksy/hylkää.
   * Ohjelman detailissa: liikkeet (nimi, setit×toistot, paino), lisäys, poisto.
   * **AI Coach**: 3-vaiheinen haastattelu (tavoite / kokemus / vahvuustaso) tap-napeilla. Claude personoi painot/setit/toistot. Before/after vertailu ennen tallennusta.
   * Sessio-cache (sessionStorage).
   * Lihasryhmäikonit Programs-korteissa (suuret 48px kuvat + label).

4. **Treenin Seuranta (Workout Logger)** ✅
   * Käyttäjä valitsee ohjelman Home-näkymässä → START → WorkoutLogger.
   * Liikkeet kortteina: setnumerot allekkain, Reps + Weight(kg) inputit per setti.
   * Settien kuittaus vihreäksi kun tehty.
   * "Add Set" per liike.
   * Stopwatch-ajastin (Orbitron-fontti).
   * Tallennus Firestoreen: `users/{uid}/workouts/{workoutId}` (8s timeout).
   * Valmistumisruutu: duration, sets done, Zyzz-motivaatiolainaus (69 lainausta).

5. **Tilastot (Stats)** ✅
   * Firestore-workoutit järjestyksessä, liike-dropdown.
   * PR-badge (personal record).
   * Recharts LineChart — Tron-tyylinen ruudukko, hehkuva syaaniviiva.
   * Jos viimeinen piste on ylöspäin: loppukurvi liekkiä (pinkki glow).
   * GlowDot custom component, SVG glow-filter.

6. **Estetiikka** ✅
   * Google Fonts: Orbitron (display) + Exo 2 (body).
   * Neon flicker animaatio, glow-pulse, scanlines, tron-grid.
   * Bottom nav: Orbitron-fontti, neon hover.
   * Lihasryhmäikonit: `/public/icons/` (chest/back/shoulders/arms/legs/core/biceps/triceps/hamstrings).

## 3. Tietokannan Malli (Firestore)

```text
users/{uid}
  ├── programs/{programId}
  │     ├── name: string
  │     ├── muscleGroups: string[]
  │     ├── exercises: [{ name, sets, reps, weight, muscleGroup }]
  │     └── createdAt: string
  └── workouts/{workoutId}
        ├── programId: string
        ├── programName: string
        ├── date: string
        └── exercises: [
              {
                name: string,
                muscleGroup: string,
                sets: [{ reps, weight, completed }]
              }
            ]
```

## 4. Komponenttirakenne

```
src/
  App.tsx                  ✅ Auth guard, routing, bottom nav
  firebase.ts              ✅ Firebase + Anthropic init
  lib/
    muscleIcons.ts         ✅ Lihasryhmä → ikonipolku
  components/
    Login.tsx              ✅ Google sign-in, Zyzz hero
    Profile.tsx            ✅ Käyttäjätiedot + sign out
    Home.tsx               ✅ Hero banner, ohjelmalista, START
    Programs.tsx           ✅ Ohjelmalista, Load Defaults, AI Suggest, AI Coach
    WorkoutLogger.tsx      ✅ Aktiivinen treeni-istunto, timer, finish
    Stats.tsx              ✅ Recharts-graafi, PR badge, flame effect
```

## 5. Toteutettu v0.2.0+

- ✅ AI paino-suositukset WorkoutLoggerissa (Claude, JSON, Apply-nappi)
- ✅ Firebase Hosting — https://supergainz.web.app
- ✅ Workout streak — liekki-ikoni + päivälaskuri Homessa
- ✅ Rest timer — per-liike, tap-to-cycle (30/60/90/120/180s), countdown-palkki
- ✅ Zyzz voice-lines — neon-toast setti kuitatessa
- ✅ Remove set — roskakori-ikoni per setti

## 6. Backlog

### Pian toteutettavat
- 🔲 **Body weight tracking** — päivittäinen painonseuranta Statsissa omana grafana-välilehtenä
  - ⚠️ HUOM: painotieto on sensitiivistä — ennen julkaisua mietittävä datan enkryptaus, käyttöehdot ja GDPR. MVP:ssä tallennetaan vain omalle Firestore-tilille.
- 🔲 **1RM calculator** — syötä paino + toistot → arvioitu maksimi (Epley-kaava), näkyy Statsissa
- 🔲 **JSON/PDF export** — "Take my data" -nappi Profiilissa, lataa kaikki workoutit

### Enemmän työtä
- 🔲 **Weekly summary** — maanantai-yhteenveto: treenit, paras lifti, streak, motivaatiokuva
- 🔲 **Push notifications** — muistutus jos ei treeniä X päivään
  - ⚠️ Vaatii Firebase Blaze -plan (pay-as-you-go) Cloud Functionsia varten. FCM itse ilmainen.
- 🔲 **Offline support** — Firestore offline-cache, treeni tallentuu vaikka netti katkeaa

### Security
- 🔲 **Firestore Security Rules** — tuotantotason säännöt ennen laajempaa julkaisua
