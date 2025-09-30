# Login 3D Illustrator Model

Place your GLB/GLTF files in this folder and point the environment variable to the filename.

Defaults used by the app:
- NEXT_PUBLIC_LOGIN_3D_MODEL=/models/illustrator.glb
- NEXT_PUBLIC_LOGIN_3D_SCALE=1.4
- NEXT_PUBLIC_LOGIN_3D_ROT_Y=0.3
- NEXT_PUBLIC_LOGIN_3D_POS_Y=-0.2

Recommended
- Keep file size < 8–10 MB for fast load.
- Use binary GLB format when possible.
- Prefer PBR materials with baked lighting for the best visual result.

How to use
1. Export or download a GLB file (e.g., `illustrator.glb`).
2. Copy it into this folder: `public/models/illustrator.glb`.
3. Start the dev server. The login page will load your model automatically.

Advanced (optional)
- To change model path without moving files, set env variables in `.env.local`:
  ```bash
  NEXT_PUBLIC_LOGIN_3D_MODEL=/models/your-model.glb
  NEXT_PUBLIC_LOGIN_3D_SCALE=1.3
  NEXT_PUBLIC_LOGIN_3D_ROT_Y=0.2
  NEXT_PUBLIC_LOGIN_3D_POS_Y=-0.1
  ```
- You can fine-tune these values at runtime and restart the dev server.
