import React from 'react';
import { Monitor, Eye, Trash2, CalendarDays, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DeviceTable({
  loading,
  filtered,
  statusColors,
  setDetailItem,
  setDeleteId
}) {
  // สถานะกำลังโหลด
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // สถานะไม่มีข้อมูล
  if (filtered.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Monitor size={40} className="mx-auto mb-3 opacity-30" />
        <p>ไม่พบข้อมูลอุปกรณ์</p>
      </div>
    );
  }

  // แสดงผลตารางปกติ
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">รหัสอุปกรณ์</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ชื่ออุปกรณ์</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ประเภท</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">แผนก</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">มอบหมาย</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">สถานะ</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">วันหมดประกัน</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((d) => {
              const sc = statusColors[d.status] || statusColors.เสีย;

              // 🎨 ฟังก์ชันเลือกสีป้ายประกันให้เนียนตา
              const renderWarrantyStatus = (expireDateString) => {
                if (!expireDateString) return <span className="text-muted-foreground/40 font-mono text-xs">—</span>;

                const expireDate = new Date(expireDateString);
                const today = new Date();
                
                today.setHours(0, 0, 0, 0);
                expireDate.setHours(0, 0, 0, 0);

                // คำนวณส่วนต่างของวัน
                const diffTime = expireDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                const formattedDate = expireDate.toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                // 1. เคสหมดประกันแล้ว (สีแดงพาสเทลหรู ๆ เด้งเตือน)
                if (diffDays < 0) {
                  return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/50 shadow-sm animate-pulse">
                      <AlertTriangle size={12} />
                      หมดประกัน ({formattedDate})
                    </span>
                  );
                }

                // 2. เคสใกล้หมดประกัน ภายใน 30 วัน (สีส้ม/เหลืองพาสเทล ให้เตรียมตัว)
                if (diffDays <= 30) {
                  return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50 shadow-sm">
                      <CalendarDays size={12} />
                      ใกล้หมด ({formattedDate})
                    </span>
                  );
                }

                // 3. เคสประกันเหลือเฟือ (สีเขียวมินต์ นุ่มนวล สบายตา)
                return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/30">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    {formattedDate}
                  </span>
                );
              };

              return (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.asset_tag || '—'}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.department || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.assigned_to || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center justify-center rounded-full text-xs font-medium w-24 h-7 shadow-sm"
                      style={{ background: sc.bg, color: sc.color }}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {renderWarrantyStatus(d.warranty_expire)}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDetailItem(d)}
                      >
                        <Eye size={14} />
                      </Button>
                      
                      {/* 🔴 นำปุ่มดินสอ (Edit) ออกเรียบร้อยแล้ว */}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(d.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}