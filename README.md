# UnitedTribes Universes — Proof of Concept

Interactive design comps for the UnitedTribes Pluribus discovery experience. Demonstrates how AI-powered responses are transformed into rich, interconnected cultural discovery experiences using the UnitedTribes Knowledge Graph.

## Screens

1. **Home** — Universe selector with contextual explore panel (Pluribus, Blue Note, Patti Smith, Greta Gerwig)
2. **Thinking** — Knowledge graph analysis with 6-step progress animation
3. **Response** — Enhanced discovery with contextual content groups, entity quick view panel, and compare mode
4. **Constellation** — Interactive node graph showing entity relationships
5. **Entity Detail** — Full knowledge graph record (data-driven for Vince Gilligan + Breaking Bad)

## Stack

- React (single-file component)
- Vite build system
- DM Sans typography
- No external UI framework

## Running Locally

```bash
npm install
npm run dev
```

## Building for Production

```bash
npm run build
```

Output goes to `dist/` — static files ready for S3, Amplify, or any static host.

## Deploying to AWS S3

```bash
chmod +x deploy.sh
./deploy.sh
```

Edit `deploy.sh` to set your S3 bucket name.
