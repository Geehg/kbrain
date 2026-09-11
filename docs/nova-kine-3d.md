# NOVA KINE interactive model

The editor defaults to a Three.js product view. The existing 2D keymap remains available, including a fallback if WebGL is unavailable. The 3D view shares key IDs, plate coordinates, selection and pressed/tested matrix addresses with the existing editor. Viewing, rotating and pressing the model never writes to hardware. Only the existing device apply flow writes a preset.

## Reference basis

- [Manufacturer product page](https://www.luminkey.com/products/luminkey-nova-kine-keyboard): 111.65 × 136.01 mm, 24.5 mm height, anodized 6063 aluminum, blank Frost keycaps, silver/gray/black finishes. The stated height does not specify whether it includes keycaps.
- [Official manual](https://cdn.shopify.com/s/files/1/0815/1800/2452/files/Nova_Kine_user_guide_77b098bd-6f5b-4df1-812a-a262a244c5c3.pdf?v=1781226519): printed pages 3, 10–12 describe the bottom power switch, layouts, and USB entry. The underside drawing is rotated relative to the portrait front.
- [Front and underside](https://cdn.shopify.com/s/files/1/0815/1800/2452/files/lk_pad.4998_34b803b0-6dd9-4ba8-90c7-89d31b41f3d0.png?v=1779091623): two rubber rails, narrow nameplate with switch, and 91 circular dimples.
- [Three-quarter case photo](https://www.luminkey.com/cdn/shop/files/2026-04-23230507.jpg?v=1779091885&width=2400): raised main surround, lower side controls, bottom seam, tapered caps and knurled roller.
- [USB placement](https://www.luminkey.com/cdn/shop/files/10_33ede6e2-e8d5-4de7-a6bf-023e9ecaa305.jpg?v=1779090219&width=2400): rear short edge behind isolated four-key row, centered approximately on the main key area.

This is a parametric visual reconstruction, not manufacturer CAD. Pitch, radii, recesses, thicknesses and port offsets are inferred from photos. The frosted corner is an antenna compartment, not a display or receiver holder. Key-name overlays, selection outlines and connection preview lighting are software annotations. Power-switch and roller interactions animate the model only; the app does not read the real switch or LED state.

## Controls and compatibility

Drag with one pointer to orbit; wheel/two-finger pinch to zoom. Buttons select top, underside, left/right, USB edge or three-quarter views. Canvas keyboard controls: arrows rotate, +/− zoom, Home resets. Selecting a modeled key opens its existing inspector. All A/B/C/D plates, mirrored arrangements and 0/90/180/270° orientations retain matrix addresses.

Three.js loads on demand. A single renderer is retained across key-test updates. Geometry and textures are disposed when rebuilding or unmounting; rendering idles when no movement or input changes exist, and pauses offscreen. Reduced-motion settings disable transition motion and turn off automatic rotation when enabled by the OS.

Run `node scripts/verify-kine-model.mjs` to verify all 32 plate/mirror/rotation combinations, bounds, non-overlap, matrix identity, selectable key centers and underside occlusion. Type-check with `npx tsc --noEmit --incremental false` and build with `npm run build`.
