import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { History, ArrowLeft, Monitor, User, Calendar, ShieldCheck, Tag, Info, Clock } from 'lucide-react';

export default function DeviceDetailDialog({ isOpen, setIsOpen, detailItem }) {
  const [showHistory, setShowHistory] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ฟังก์ชันดึงข้อมูลประวัติจาก Supabase
  const fetchDeviceHistory = async () => {
    if (!detailItem?.id) return;
    setLoadingHistory(true);

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

  useEffect(() => {
    if (showHistory && detailItem?.id) {
      fetchDeviceHistory();
    }
  }, [showHistory, detailItem?.id]);

  useEffect(() => {
    if (!isOpen) {
      setShowHistory(false);
      setHistoryLogs([]);
    } else {
      if (showHistory && detailItem?.id) {
        fetchDeviceHistory();
      }
    }
  }, [isOpen]);

  // ฟังก์ชันแยกสีตาม Action ของ Log
  const getActionColor = (action) => {
    const act = action?.toUpperCase() || "";
    if (act.includes("เพิ่ม") || act.includes("CREATE")) return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200";
    if (act.includes("ลบ") || act.includes("DELETE")) return "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200";
    return "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200";
  };

  // จัดฟอร์แมตฟิลด์ข้อมูลที่เปลี่ยนให้สวยงาม
  const renderChangedFields = (fields) => {
    if (!fields) return null;
    let parsedFields = fields;
    if (typeof fields === 'string') {
      try {
        if (fields.trim().startsWith('{') || fields.trim().startsWith('[')) {
          parsedFields = JSON.parse(fields);
        }
      } catch (e) {
        parsedFields = fields;
      }
    }

    if (typeof parsedFields === 'object' && parsedFields !== null) {
      return (
        <div className="space-y-2 mt-2 w-full">
          {Object.entries(parsedFields).map(([key, value]) => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-background/50 p-2 rounded-lg border text-xs w-full">
              <span className="font-semibold text-foreground/80 shrink-0 bg-muted px-2 py-0.5 rounded border sm:w-[25%] text-center font-mono truncate">
                {key}
              </span>
              <div className="flex items-center gap-2 flex-wrap pl-1 sm:pl-0 sm:w-[75%]">
                {value?.old !== undefined && (
                  <>
                    <span className="text-rose-600 dark:text-rose-400 line-through bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded truncate max-w-[45%]">{String(value.old)}</span>
                    <span className="text-muted-foreground font-mono">→</span>
                  </>
                )}
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded truncate max-w-[45%]">
                  {value?.new !== undefined ? String(value.new) : String(value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const fieldLines = String(fields).split(/,|\n/).filter(Boolean);
    return (
      <div className="space-y-1 mt-2 w-full">
        {fieldLines.map((line, idx) => (
          <p key={idx} className="font-mono text-xs text-foreground/80 bg-background/50 p-2 rounded-lg flex items-start gap-2 border w-full">
            <span className="text-amber-500 shrink-0">▪</span>
            <span className="whitespace-pre-line breaking-words w-[95%]">{line.trim()}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-2xl">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
            {showHistory && (
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 hover:bg-muted rounded-full transition-colors border shadow-sm"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            {showHistory ? (
              <div className="flex items-center gap-2 text-primary">
                <History size={20} />
                <span>ประวัติการเปลี่ยนแปลง</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-primary">
                <Monitor size={20} />
                <span>รายละเอียดอุปกรณ์</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {detailItem && (
          <div className="mt-4 w-full">
            {!showHistory ? (
              /* ================== หน้ารายละเอียดแบบ % Layout ================== */
              <div className="space-y-6 w-full">
                {/* ส่วนหัวภาพและการ์ดข้อมูลเบื้องต้นปรับสัดส่วน % */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 bg-muted/20 p-4 rounded-2xl border w-full">
                  <div className="w-[130px] sm:w-[20%] shrink-0 aspect-square">
                    {detailItem?.image_url ? (
                      <img
                        src={detailItem.image_url}
                        alt={detailItem.name}
                        className="w-full h-full object-cover rounded-xl border bg-background shadow-md"
                      />
                    ) : (
                      <div className="w-full h-full bg-background rounded-xl flex flex-col items-center justify-center text-xs text-muted-foreground border border-dashed text-center p-3">
                        <Monitor size={28} className="mb-1 opacity-40 text-muted-foreground" />
                        <span>ไม่มีรูปภาพ</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 text-center sm:text-left w-full sm:w-[80%]">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                      <Tag size={12} />
                      {detailItem.asset_tag || "ไม่ระบุรหัส"}
                    </div>
                    <h3 className="text-xl font-bold text-foreground leading-tight break-words">{detailItem.name || "-"}</h3>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <span className="text-xs px-2.5 py-1 bg-background border rounded-lg font-medium shadow-sm text-muted-foreground flex items-center gap-1">
                        <Info size={12} /> {detailItem.category || "-"}
                      </span>
                      <span className="text-xs px-2.5 py-1 bg-background border rounded-lg font-semibold shadow-sm text-primary flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                        {detailItem.status || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ข้อมูลการจัดสรรแบบแบ่ง % ซ้าย-ขวา */}
                <div className="bg-background rounded-xl border p-4 shadow-sm space-y-4 w-full">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                    <User size={14} className="text-primary" />
                    ข้อมูลผู้ถือครองและการจัดสรร
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4 w-full">
                    <div className="w-full">
                      <Label className="text-muted-foreground text-xs font-medium">ผู้ได้รับมอบหมาย</Label>
                      <p className="mt-1 font-semibold text-sm bg-muted/40 px-3 py-2 rounded-lg border text-foreground/90 truncate">{detailItem.assigned_to || "—"}</p>
                    </div>
                    <div className="w-full">
                      <Label className="text-muted-foreground text-xs font-medium">ฝ่าย / แผนก</Label>
                      <p className="mt-1 font-semibold text-sm bg-muted/40 px-3 py-2 rounded-lg border text-foreground/90 truncate">{detailItem.department || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* ข้อมูลการรับประกันแบบแบ่ง % ซ้าย-ขวา */}
                <div className="bg-background rounded-xl border p-4 shadow-sm space-y-4 w-full">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                    <ShieldCheck size={14} className="text-primary" />
                    ข้อมูลวันที่และการรับประกัน
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4 w-full">
                    <div className="w-full">
                      <Label className="text-muted-foreground text-xs font-medium">วันที่ซื้ออุปกรณ์</Label>
                      <p className="mt-1 font-semibold text-sm bg-muted/40 px-3 py-2 rounded-lg border text-foreground/90 flex items-center gap-1.5">
                        <Calendar size={14} className="opacity-60" />
                        {detailItem.purchase_date || "—"}
                      </p>
                    </div>
                    <div className="w-full">
                      <Label className="text-muted-foreground text-xs font-medium">วันหมดอายุการรับประกัน</Label>
                      <p className="mt-1 font-semibold text-sm bg-muted/40 px-3 py-2 rounded-lg border text-foreground/90 flex items-center gap-1.5">
                        <Calendar size={14} className="opacity-60 text-primary" />
                        {detailItem.warranty_expire || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ================== หน้าประวัติแบบซ่อน Scrollbar ================== */
              <div
                className="max-h-[58vh] overflow-y-auto pr-1 scrollbar-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // ซ่อน Scrollbar สำหรับ Firefox & IE/Edge
              >
                {/* แทรกสไตล์ CSS ดิบสำหรับซ่อน Scrollbar ใน Chrome/Safari */}
                <style>{`
                  .scrollbar-none::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>

                {loadingHistory ? (
                  <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                    <p className="text-sm text-muted-foreground">กำลังดึงข้อมูลประวัติย้อนหลัง...</p>
                  </div>
                ) : historyLogs.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground bg-muted/10 border border-dashed rounded-xl">
                    <History size={36} className="mx-auto mb-2 opacity-30 text-muted-foreground" />
                    <p className="text-sm">ไม่พบประวัติการทำรายการหรือแก้ไขข้อมูลอุปกรณ์นี้</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-muted pl-5 ml-4 space-y-6 my-3">
                    {historyLogs.map((log) => (
                      <div key={log.id} className="relative animate-in fade-in slide-in-from-bottom-3 duration-200">
                        {/* จุดกลมนำสายตาบนเส้น Timeline */}
                        <div className="absolute -left-[27px] top-1 bg-background border-2 border-primary rounded-full w-3 h-3 shadow-sm z-10" />

                        <div className="bg-background p-4 rounded-xl border shadow-sm hover:shadow-md transition-all">
                          {/* บาร์หัวข้อแสดงประเภทประวัติและเวลา */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-2.5">
                            <span className={`text-[11px] font-bold tracking-wide px-2.5 py-0.5 rounded-full border shadow-sm uppercase ${getActionColor(log.action_type)}`}>
                              {log.action_type || "EDITED"}
                            </span>
                            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Clock size={12} />
                              {log.created_at ? new Date(log.created_at).toLocaleString('th-TH', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              }) : "-"}
                            </span>
                          </div>

                          {/* เนื้อหารายละเอียดภายใน */}
                          <div className="text-xs space-y-3 mt-3">
                            <div className="leading-relaxed">
                              <span className="text-muted-foreground font-medium">รายละเอียดงาน: </span>
                              <span className="text-foreground font-semibold break-words">{log.details || "ไม่มีข้อมูลรายละเอียดเพิ่มเติม"}</span>
                            </div>

                            {/* กล่องแสดงสิ่งที่ถูกแก้ไขข้อมูล */}
                            {log.changed_fields && (
                              <div className="p-3 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/15 w-full">
                                <p className="text-[11px] font-bold text-primary flex items-center gap-1">
                                  <span>🔍 ข้อมูลการแก้ไขแอตทริบิวต์:</span>
                                </p>
                                {renderChangedFields(log.changed_fields)}
                              </div>
                            )}
                          </div>

                          {/* บอร์ดท้ายการ์ดประวัติ: แสดงชื่อผู้บันทึก */}
                          <div className="text-[11px] pt-2 mt-3 border-t border-dashed text-muted-foreground flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span>เจ้าหน้าที่ผู้จัดการ:</span>
                              <span className="font-semibold text-foreground bg-muted/60 border rounded px-2 py-0.5 shadow-sm">
                                👤 {log.operator_name || log.user_email || "System"}
                              </span>
                            </div>
                            {log.user_role && (
                              <span className="text-[9px] font-extrabold tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded border uppercase">
                                {log.user_role}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ส่วนท้ายฟอร์ม */}
            <div className="flex justify-end items-center gap-2.5 mt-6 border-t pt-4">
              <Button
                className="hover:bg-[#111827] hover:text-white"
                variant="outline"
                onClick={() => {
                  if (showHistory) {
                    setShowHistory(false);
                  } else {
                    setIsOpen(false);
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