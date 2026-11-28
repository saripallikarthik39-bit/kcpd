import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Box, Play, Pause } from 'lucide-react';
import { db } from '../db/database';
import type { Product } from '../types/store';

function isExpiringSoon(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  const diffHours =
    (new Date(expiryDate + 'T23:59:59').getTime() - Date.now()) / (1000 * 60 * 60);
  return diffHours <= 48;
}

export function StoreShelf3D() {
  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [yawDeg, setYawDeg] = useState(35);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedProduct: Product | undefined =
    products.find((p) => p.id === selectedId) ?? products[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || products.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let currentYaw = (yawDeg * Math.PI) / 180;

    const project = (x: number, y: number, z: number, yaw: number, cx: number, cy: number) => {
      const pitch = 0.58; // Isometric elevation angle
      const rx = x * Math.cos(yaw) - z * Math.sin(yaw);
      const rz = x * Math.sin(yaw) + z * Math.cos(yaw);
      const ry = y * Math.cos(pitch) - rz * Math.sin(pitch);
      const depth = y * Math.sin(pitch) + rz * Math.cos(pitch);
      const scale = 520 / (520 - depth);
      return { sx: cx + rx * scale, sy: cy - ry * scale, depth };
    };

    const draw3DBox = (
      x: number,
      z: number,
      width: number,
      height: number,
      topColor: string,
      leftColor: string,
      rightColor: string,
      strokeColor: string,
      yaw: number,
      cx: number,
      cy: number
    ) => {
      const hw = width / 2;
      const b0 = project(x - hw, 0, z - hw, yaw, cx, cy);
      const b1 = project(x + hw, 0, z - hw, yaw, cx, cy);
      const b2 = project(x + hw, 0, z + hw, yaw, cx, cy);
      const b3 = project(x - hw, 0, z + hw, yaw, cx, cy);

      const t0 = project(x - hw, height, z - hw, yaw, cx, cy);
      const t1 = project(x + hw, height, z - hw, yaw, cx, cy);
      const t2 = project(x + hw, height, z + hw, yaw, cx, cy);
      const t3 = project(x - hw, height, z + hw, yaw, cx, cy);

      const faces = [
        { pts: [b0, b1, t1, t0], color: leftColor, depth: (b0.depth + b1.depth) / 2 },
        { pts: [b1, b2, t2, t1], color: rightColor, depth: (b1.depth + b2.depth) / 2 },
        { pts: [b2, b3, t3, t2], color: leftColor, depth: (b2.depth + b3.depth) / 2 },
        { pts: [b3, b0, t0, t3], color: rightColor, depth: (b3.depth + b0.depth) / 2 },
      ].sort((a, b) => a.depth - b.depth);

      for (const face of faces) {
        ctx.beginPath();
        ctx.moveTo(face.pts[0].sx, face.pts[0].sy);
        for (let i = 1; i < face.pts.length; i++) {
          ctx.lineTo(face.pts[i].sx, face.pts[i].sy);
        }
        ctx.closePath();
        ctx.fillStyle = face.color;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Top cap
      ctx.beginPath();
      ctx.moveTo(t0.sx, t0.sy);
      ctx.lineTo(t1.sx, t1.sy);
      ctx.lineTo(t2.sx, t2.sy);
      ctx.lineTo(t3.sx, t3.sy);
      ctx.closePath();
      ctx.fillStyle = topColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      return project(x, height + 10, z, yaw, cx, cy);
    };

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (autoRotate) {
        currentYaw += 0.0045;
      }

      const cx = w / 2;
      const cy = h * 0.68;

      // Draw 3D base grid floor
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 1;
      for (let g = -120; g <= 120; g += 40) {
        const p1 = project(g, 0, -120, currentYaw, cx, cy);
        const p2 = project(g, 0, 120, currentYaw, cx, cy);
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();

        const p3 = project(-120, 0, g, currentYaw, cx, cy);
        const p4 = project(120, 0, g, currentYaw, cx, cy);
        ctx.beginPath();
        ctx.moveTo(p3.sx, p3.sy);
        ctx.lineTo(p4.sx, p4.sy);
        ctx.stroke();
      }

      // Arrange 9 SKUs in a 3x3 3D counter grid and sort back-to-front
      const maxStock = Math.max(...products.map((p) => p.stock), 1);
      const gridItems = products.slice(0, 9).map((product, idx) => {
        const col = (idx % 3) - 1;
        const row = Math.floor(idx / 3) - 1;
        const gx = col * 72;
        const gz = row * 72;
        const centerProj = project(gx, 0, gz, currentYaw, cx, cy);
        return { product, gx, gz, depth: centerProj.depth };
      });

      gridItems.sort((a, b) => a.depth - b.depth);

      for (const item of gridItems) {
        const { product, gx, gz } = item;
        const lowStock = product.stock <= product.low_stock_threshold;
        const expiring = isExpiringSoon(product.expiry_date);
        const isSelected = selectedProduct?.id === product.id;

        const barHeight = Math.max(16, (product.stock / maxStock) * 115);

        let topColor = '#10B981';
        let leftColor = '#059669';
        let rightColor = '#047857';
        if (expiring) {
          topColor = '#EF4444';
          leftColor = '#DC2626';
          rightColor = '#991B1B';
        } else if (lowStock) {
          topColor = '#F59E0B';
          leftColor = '#D97706';
          rightColor = '#92400E';
        }

        const labelPos = draw3DBox(
          gx,
          gz,
          36,
          barHeight,
          topColor,
          leftColor,
          rightColor,
          isSelected ? '#FFFFFF' : 'rgba(15, 23, 42, 0.7)',
          currentYaw,
          cx,
          cy
        );

        ctx.font = isSelected ? '600 11px "Plus Jakarta Sans", sans-serif' : '500 10px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = isSelected ? '#FFFFFF' : '#CBD5E1';
        ctx.textAlign = 'center';
        ctx.fillText(product.name, labelPos.sx, labelPos.sy);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [products, autoRotate, yawDeg, selectedProduct?.id]);

  return (
    <section className="rounded-xl border border-slate-800 bg-[#1E293B] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Box className="h-5 w-5 text-[#10B981]" />
          <div>
            <h2 className="text-base font-semibold text-white">
              3D Live Inventory Shelf Visualizer
            </h2>
            <p className="text-[11px] text-slate-400">
              Height = live stock | Green = healthy | Amber = low stock | Red = expiring soon
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAutoRotate((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0F172A] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500"
          >
            {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{autoRotate ? 'Pause 3D' : 'Auto-Rotate'}</span>
          </button>

          {!autoRotate && (
            <input
              type="range"
              min={0}
              max={360}
              value={yawDeg}
              onChange={(e) => setYawDeg(Number(e.target.value))}
              className="w-24 accent-[#10B981]"
              aria-label="Rotate 3D shelf angle"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
        {/* 3D Canvas Stage */}
        <div className="flex justify-center overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A] p-2 lg:col-span-8">
          <canvas
            ref={canvasRef}
            width={560}
            height={280}
            className="h-auto max-w-full"
          />
        </div>

        {/* Right: Interactive SKU Inspector */}
        <div className="space-y-3 lg:col-span-4">
          <div className="flex flex-wrap gap-1.5">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id ?? null)}
                className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                  selectedProduct?.id === p.id
                    ? 'border-[#10B981] bg-[#10B981]/15 text-[#10B981]'
                    : 'border-slate-700 bg-[#0F172A] text-slate-300 hover:border-slate-500'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {selectedProduct && (
            <div className="rounded-lg border border-slate-700/80 bg-[#0F172A] p-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-sm font-bold text-white">{selectedProduct.name}</span>
                <span className="font-mono-num font-bold text-[#10B981]">
                  ₹{selectedProduct.selling_price}/{selectedProduct.unit}
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Live Stock</p>
                  <p className="font-mono-num text-sm font-semibold text-white">
                    {selectedProduct.stock} {selectedProduct.unit}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Shelf Value</p>
                  <p className="font-mono-num text-sm font-semibold text-slate-200">
                    ₹{(selectedProduct.stock * selectedProduct.selling_price).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Low Threshold</p>
                  <p className="font-mono-num text-xs text-slate-300">
                    {selectedProduct.low_stock_threshold} {selectedProduct.unit}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Batch Expiry</p>
                  <p className="font-mono-num text-xs text-slate-300">
                    {selectedProduct.expiry_date ?? 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}