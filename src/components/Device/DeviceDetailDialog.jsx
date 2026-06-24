import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase'; // เรียกใช้ supabase สำหรับดึงประวัติ
import { History, ArrowLeft } from 'lucide-react'; // เพิ่มไอคอนช่วยนำสายตา

export default function DeviceDetailDialog({ isOpen, setIsOpen, detailItem }) {
  const [showHistory, setShowHistory] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ฟังก์ชันดึงข้อมูลประวัติจาก Supabase
  const fetchDeviceHistory = async () => {
    if (!detailItem?.id) return;
    setLoadingHistory(true);

    // ดึง Log ประวัติการกรอก/แก้ไขจากตาราง device_logs
    const { data, error } = await supabase
      .from('device_logs')
      .select('*')
      .eq('device_id', detailItem.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setHistoryLogs(data || []);
    } else {
      console.error("Error fetching history:", error.message);
    }
    setLoadingHistory(false);
  };

  // ดึงประวัติใหม่ทุกครั้งที่กดเปิดดูหน้าต่างประวัติ
  useEffect(() => {
    if (showHistory && detailItem?.id) {
      fetchDeviceHistory();
    }
  }, [showHistory, detailItem?.id]); // ดักจับที่ id ของอุปกรณ์โดยตรง

  // ✨ 2. รีเซ็ตหน้าต่างประวัติเมื่อปิด Dialog หลัก และรีโหลดข้อมูลใหม่เมื่อ Dialog ถูกเปิดขึ้นมา
  useEffect(() => {
    if (!isOpen) {
      setShowHistory(false);
      setHistoryLogs([]);
    } else {
      // ถ้าเปิด Dialog ขึ้นมาแล้ว และบังเอิญหน้าจอมันค้างอยู่ที่หน้าประวัติ ให้โหลดข้อมูลใหม่ทันที
      if (showHistory && detailItem?.id) {
        fetchDeviceHistory();
      }
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* 📏 ปรับขนาดความกว้างเป็น max-w-2xl ให้เท่ากับฟอร์มหน้า Add และ Edit เป๊ะๆ */}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showHistory && (
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            {showHistory ? "ประวัติการเปลี่ยนแปลงอุปกรณ์" : "รายละเอียดอุปกรณ์"}
          </DialogTitle>
        </DialogHeader>

        {detailItem && (
          <div className="space-y-6 mt-4">

            {!showHistory ? (
              /* ================== หน้าแสดงรายละเอียดปกติ (Layout บล็อกเท่าหน้าฟอร์ม) ================== */
              <>
                {/* ส่วนแสดงรูปภาพ (ล้อกพิกัดเดียวกับ ImageUploader) */}
                <div className="flex justify-center">
                  {detailItem?.image_url ? (
                    <img
                      src={detailItem.image_url}
                      alt={detailItem.name}
                      className="w-[140px] h-[140px] object-cover rounded-xl border shadow-sm"
                    />
                  ) : (
                    <div className="w-[140px] h-[140px] bg-muted rounded-xl flex items-center justify-center text-xs text-muted-foreground border border-dashed text-center p-2">
                      ไม่มีรูปภาพ
                    </div>
                  )}
                </div>

                {/* Row 1: รหัสอุปกรณ์ & ชื่ออุปกรณ์ */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">รหัสอุปกรณ์</Label>
                    <div className="bg-muted/30 rounded-md border p-2 text-sm font-medium mt-1 min-h-[40px] flex items-center">
                      {detailItem.asset_tag || "-"}
                    </div>
                    <div className="min-h-[20px] mt-1" /> {/* จองพื้นที่เท่าฟอร์มหลัก */}
                  </div>

                  <div>
                    <Label className="text-muted-foreground">ชื่ออุปกรณ์</Label>
                    <div className="bg-muted/30 rounded-md border p-2 text-sm font-medium mt-1 min-h-[40px] flex items-center">
                      {detailItem.name || "-"}
                    </div>
                    <div className="min-h-[20px] mt-1" />
                  </div>
                </div>

                {/* Row 2: ประเภท & สถานะ */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">ประเภท</Label>
                    <div className="bg-muted/30 rounded-md border p-2 text-sm font-medium mt-1 min-h-[40px] flex items-center">
                      {detailItem.category || "-"}
                    </div>
                    <div className="min-h-[20px] mt-1" />
                  </div>

                  <div>
                    <Label className="text-muted-foreground">สถานะ</Label>
                    <div className="bg-muted/30 rounded-md border p-2 text-sm font-medium mt-1 min-h-[40px] flex items-center">
                      {detailItem.status || "-"}
                    </div>
                    <div className="min-h-[20px] mt-1" />
                  </div>
                </div>

                {/* Row 3 & 4: มอบหมาย, แผนก, วันที่ซื้อ, วันหมดประกัน */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">มอบหมาย</Label>
                    <div className="bg-muted/30 rounded-md border p-2 text-sm font-medium mt-1 min-h-[40px] flex items-center">
                      {detailItem.assigned_to || "-"}
                    </div>
                    <div className="min-h-[20px] mt-1" />
                  </div>

                  <div>
                    <Label className="text-muted-foreground">แผนก</Label>
                    <div className="bg-muted/30 rounded-md border p-2 text-sm font-medium mt-1 min-h-[40px] flex items-center">
                      {detailItem.department || "-"}
                    </div>
                    <div className="min-h-[20px] mt-1" />
                  </div>

                  <div>
                    <Label className="text-muted-foreground">วันที่ซื้อ</Label>
                    <div className="bg-muted/30 rounded-md border p-2 text-sm font-medium mt-1 min-h-[40px] flex items-center">
                      {detailItem.purchase_date || "-"}
                    </div>
                    <div className="min-h-[20px] mt-1" />
                  </div>

                  <div>
                    <Label className="text-muted-foreground">วันหมดประกัน</Label>
                    <div className="bg-muted/30 rounded-md border p-2 text-sm font-medium mt-1 min-h-[40px] flex items-center">
                      {detailItem.warranty_expire || "-"}
                    </div>
                    <div className="min-h-[20px] mt-1" />
                  </div>
                </div>
              </>
            ) : (
              /* ================== หน้าแสดงประวัติ (History Timeline View) ================== */
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                {loadingHistory ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูลประวัติ...</p>
                  </div>
                ) : historyLogs.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-12">ไม่พบประวัติการแก้ไขหรือทำรายการของอุปกรณ์ชิ้นนี้</p>
                ) : (
                  <div className="relative border-l border-muted-foreground/20 pl-4 ml-3 space-y-6 my-2">
/* ================== หน้าแสดงประวัติ (History Timeline View) ================== */
                    {/* 💡 ปรับตรงนี้: เพิ่ม style ซ่อน scrollbar เพื่อไม่ให้มันขึ้นซ้อนกันเป็น 2 แท่งครับ */}
                    <div
                      className="space-y-4 max-h-[58vh] overflow-y-auto pr-2"
                      style={{
                        scrollbarWidth: 'none',          /* สำหรับ Firefox */
                        msOverflowStyle: 'none',         /* สำหรับ IE และ Edge */
                      }}
                    >
                      {/* 🔥 เพิ่ม CSS ซ่อนสำหรับ Chrome, Safari, และ Opera */}
                      <style>{`
    div::-webkit-scrollbar {
      display: none;
    }
  `}</style>

                      {loadingHistory ? (
                        <div className="text-center py-12">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูลประวัติ...</p>
                        </div>
                      ) : historyLogs.length === 0 ? (
                        // ... โค้ดส่วนที่เหลือเหมือนเดิมเลยครับพี่ ..
                        <p className="text-center text-sm text-muted-foreground py-12">ไม่พบประวัติการแก้ไขหรือทำรายการของอุปกรณ์ชิ้นนี้</p>
                      ) : (
                        <div className="relative border-l border-muted-foreground/20 pl-4 ml-3 space-y-6 my-2">
                          {historyLogs.map((log) => {
                            // 1. ฟังก์ชันแยกสีตาม Action ของ Log
                            const getActionColor = (action) => {
                              const act = action?.toUpperCase() || "";
                              if (act.includes("เพิ่ม") || act.includes("CREATE")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                              if (act.includes("ลบ") || act.includes("DELETE")) return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
                              return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"; // UPDATE / EDIT
                            };

                            // 2. ฟังก์ชันช่วยจัดฟอร์แมตข้อมูลการเปลี่ยนแปลง (changed_fields) ให้แสดงผลละเอียดยิบ
                            const renderChangedFields = (fields) => {
                              if (!fields) return null;

                              // กรณีที่ 1: ข้อมูลส่งมาเป็น Object/JSON อยู่แล้ว หรือเป็น String JSON ที่ต้อง Parse
                              let parsedFields = fields;
                              if (typeof fields === 'string') {
                                try {
                                  // เช็คว่าเป็นรูปแบบ JSON string หรือไม่
                                  if (fields.trim().startsWith('{') || fields.trim().startsWith('[')) {
                                    parsedFields = JSON.parse(fields);
                                  }
                                } catch (e) {
                                  parsedFields = fields; // หาก parse ไม่ผ่าน ให้ใช้เป็น string ตามเดิม
                                }
                              }

                              // ถ้ากลายเป็น Object (เช่น { "status": { "old": "ใช้งานได้", "new": "ส่งซ่อม" } })
                              if (typeof parsedFields === 'object' && parsedFields !== null) {
                                return (
                                  <div className="space-y-1.5 mt-1">
                                    {Object.entries(parsedFields).map(([key, value]) => (
                                      <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 bg-muted/40 p-1.5 rounded text-[11px] border border-muted/50">
                                        <span className="font-semibold text-foreground/90 shrink-0 bg-muted px-1.5 py-0.5 rounded border min-w-[80px] text-center">
                                          🔧 {key}
                                        </span>
                                        <div className="flex items-center gap-1 flex-wrap pl-1 sm:pl-0">
                                          {value?.old !== undefined && (
                                            <>
                                              <span className="text-rose-600 dark:text-rose-400 line-through bg-rose-50 dark:bg-rose-950/30 px-1 rounded">{String(value.old)}</span>
                                              <span className="text-muted-foreground">➡️</span>
                                            </>
                                          )}
                                          <span className="text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-1 rounded">
                                            {value?.new !== undefined ? String(value.new) : String(value)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }

                              // กรณีที่ 2: เป็นข้อความธรรมดา (String) ที่คั่นด้วยเครื่องหมายจุลภาค (,) หรือขึ้นบรรทัดใหม่ (\n)
                              const fieldLines = String(fields).split(/,|\n/).filter(Boolean);
                              return (
                                <div className="space-y-1 mt-1">
                                  {fieldLines.map((line, idx) => (
                                    <p key={idx} className="font-mono text-[11px] text-foreground/90 leading-relaxed bg-muted/30 p-1.5 rounded flex items-start gap-1.5 border border-muted/30">
                                      <span className="text-amber-500 shrink-0">🔹</span>
                                      <span className="whitespace-pre-line">{line.trim()}</span>
                                    </p>
                                  ))}
                                </div>
                              );
                            };

                            return (
                              <div key={log.id} className="relative animate-in fade-in slide-in-from-bottom-2 duration-200">
                                {/* หมุดวงกลมของเส้น Timeline */}
                                <div className="absolute -left-[23px] top-1.5 bg-background border-2 border-primary rounded-full w-3 h-3 z-10" />

                                <div className="bg-muted/30 p-4 rounded-xl border shadow-sm hover:border-muted-foreground/20 transition-all">
                                  {/* ส่วนหัวของการ์ด Log: ประเภทและเวลา */}
                                  <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2 border-b pb-2 border-muted/80">
                                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getActionColor(log.action_type)}`}>
                                      {log.action_type || "อัปเดตข้อมูล"}
                                    </span>
                                    <span className="text-[11px] font-medium text-muted-foreground/90 bg-muted/60 px-2 py-0.5 rounded-md">
                                      ⏱️ {log.created_at ? new Date(log.created_at).toLocaleString('th-TH', {
                                        year: 'numeric', month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                      }) : "-"}
                                    </span>
                                  </div>

                                  {/* ส่วนรายละเอียดตรงกลาง */}
                                  <div className="text-xs space-y-2.5 mt-3">
                                    <div className="leading-relaxed flex items-start gap-1.5">
                                      <span className="text-muted-foreground shrink-0">📝 รายละเอียด:</span>
                                      <span className="text-foreground font-medium">{log.details || "ไม่มีข้อมูลรายละเอียดเพิ่มเติม"}</span>
                                    </div>

                                    {/* แสดงจุดที่เกิดการเปลี่ยนแปลงแบบแบ่งสี/แบ่งแถวชัดเจน */}
                                    {log.changed_fields && (
                                      <div className="p-3 bg-background/80 rounded-lg border border-dashed border-muted-foreground/20">
                                        <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                                          🔍 ข้อมูลที่มีการเปลี่ยนแปลง:
                                        </p>
                                        {renderChangedFields(log.changed_fields)}
                                      </div>
                                    )}
                                  </div>

                                  {/* ส่วนท้ายของการ์ด Log: แสดงข้อมูล User/Operator อย่างชัดเจน */}
                                  <div className="text-[11px] pt-2 mt-3 border-t border-dashed border-muted/80 text-muted-foreground flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span>ผู้ทำรายการ:</span>
                                      <span className="font-semibold text-foreground bg-background border rounded px-2 py-0.5 shadow-sm flex items-center gap-1">
                                        <span className="text-[10px]">👤</span> {log.operator_name || log.user_email || "System (ระบบ)"}
                                      </span>
                                    </div>

                                    {/* ถ้ามีบทบาท (Role) ของ User ที่ดึงมาจาก Log */}
                                    {log.user_role && (
                                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded">
                                        {log.user_role}
                                      </span>
                                    )}
                                  </div>

                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ส่วนท้ายฟอร์ม: จัดวางตำแหน่งปุ่มแบบเป๊ะๆ */}
            <div className="flex justify-end items-center gap-3 mt-6 border-t pt-4">
              <Button
                className="hover:bg-[#111827] hover:text-white"
                variant="outline"
                onClick={() => {
                  if (showHistory) {
                    setShowHistory(false); // ย้อนกลับมาหน้ารายละเอียดหลัก
                  } else {
                    setIsOpen(false); // ปิดหน้าต่างหลักลงไป
                  }
                }}
              >
                {showHistory ? "ย้อนกลับ" : "ปิดหน้าต่าง"}
              </Button>

              {!showHistory && (
                <Button
                  className="hover:bg-[#111827] hover:text-white"
                  variant="outline"
                  onClick={() => setShowHistory(true)}
                >
                  <History size={14} className="mr-1.5" />
                  ดูประวัติการใช้งาน
                </Button>
              )}
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}