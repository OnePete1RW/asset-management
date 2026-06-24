import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ClipboardCheck, Check, X, Filter, Search, AlertCircle, Laptop, Trash2, RefreshCw, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// สีกำกับประเภทคำขอ (Request Type)
const typeDetails = {
  Repair: { label: 'แจ้งซ่อม', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', icon: RefreshCw },
  Move: { label: 'เคลื่อนย้าย', bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6', icon: Laptop },
  Edit: { label: 'แก้ไขข้อมูล', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', icon: Pencil },
  Delete: { label: 'ลบอุปกรณ์', bg: 'rgba(239,68,68,0.12)', color: '#ef4444', icon: Trash2 },
};

const priorityColors = {
  Low: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
  Medium: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  High: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  Critical: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

export default function Approve() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [actionItem, setActionItem] = useState(null); // เก็บรายการที่กำลังดำเนินการปฏิเสธ
  const [rejectNotes, setRejectNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ดึงข้อมูลคำขอที่สถานะยังเป็น 'Pending' (รออนุมัติ) ทั้งหมด
  const loadApprovals = async () => {
    setLoading(true);
    // 💡 หมายเหตุ: ในฐานข้อมูลจริง คุณอาจแยกตาราง หรือรวมในตาราง approvalsกลาง 
    // ตัวอย่างนี้ดึงจากตาราง approvals ที่เก็บประเภทคำขอไว้ในฟิลด์ request_type
    const { data } = await supabase
      .from('approvals')
      .select('*')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });
    
    setApprovals(data || []);
    setLoading(false);
  };

  useEffect(() => { loadApprovals(); }, []);

  // ฟิลเตอร์ค้นหาและคัดกรองประเภท
  const filtered = approvals.filter(item => {
    const matchSearch = !search || 
      item.device_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.requested_by?.toLowerCase().includes(search.toLowerCase()) ||
      item.ticket_no?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || item.request_type === filterType;
    return matchSearch && matchType;
  });

  // ฟังก์ชันกด "อนุมัติ"
  const handleApprove = async (item) => {
    const confirmApprove = window.confirm(`คุณต้องการอนุมัติคำขอ [${typeDetails[item.request_type]?.label}] นี้ใช่หรือไม่?`);
    if (!confirmApprove) return;

    setSubmitting(true);
    
    // 1. อัปเดตสถานะคำขอเป็น Approved
    await supabase.from('approvals').update({ status: 'Approved' }).eq('id', item.id);
    
    // 2. 🛠️ ตัวอย่าง Logic เพิ่มเติมเมื่ออนุมัติแต่ละประเภท:
    if (item.request_type === 'Delete') {
      // ถ้าอนุมัติให้ลบ -> ไปสั่งลบอุปกรณ์ในตาราง devices จริงๆ
      await supabase.from('devices').delete().eq('id', item.device_id);
    } else if (item.request_type === 'Move') {
      // ถ้าอนุมัติให้เคลื่อนย้าย -> ไปอัปเดตสาขา/แผนกใหม่ในตาราง devices
      await supabase.from('devices').update({ location: item.new_location }).eq('id', item.device_id);
    } else if (item.request_type === 'Repair') {
      // ถ้าอนุมัติงานซ่อม -> ไปสร้างหรือเปลี่ยนสถานะในตาราง repairs เป็น In Progress
      await supabase.from('repairs').update({ status: 'In Progress' }).eq('ticket_no', item.ticket_no);
    }

    await loadApprovals();
    setSubmitting(false);
  };

  // ฟังก์ชันส่งข้อมูล "ปฏิเสธ/ไม่อนุมัติ"
  const handleRejectSubmit = async () => {
    if (!actionItem) return;
    setSubmitting(true);

    // อัปเดตสถานะเป็น Rejected พร้อมระบุเหตุผลลงในหมายเหตุ
    await supabase
      .from('approvals')
      .update({ 
        status: 'Rejected',
        notes: rejectNotes ? `ปฏิเสธเนื่องจาก: ${rejectNotes}` : 'ปฏิเสธการอนุมัติ'
      })
      .eq('id', actionItem.id);

    // หากเป็นงานซ่อม ก็อัปเดตในตารางซ่อมด้วยว่าถูก Cancelled
    if (actionItem.request_type === 'Repair') {
      await supabase.from('repairs').update({ status: 'Cancelled', notes: `ไม่ผ่านการอนุมัติ: ${rejectNotes}` }).eq('ticket_no', actionItem.ticket_no);
    }

    setRejectNotes('');
    setActionItem(null);
    setSubmitting(false);
    await loadApprovals();
  };

  return (
    <div className="space-y-5">
      {/* ส่วนหัวหน้าจอ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-heading flex items-center gap-2">
            <ClipboardCheck className="text-primary" size={24} />
            <span>งานรออนุมัติ</span>
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            ศูนย์รวมคำขอ แจ้งซ่อม, ลบ, แก้ไข และเคลื่อนย้ายอุปกรณ์ที่รอการตรวจสอบ ({approvals.length} รายการ)
          </p>
        </div>
      </div>

      {/* แถบค้นหาและฟิลเตอร์ ถอดแบบมาจากหน้า Repair */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่ออุปกรณ์, ผู้ขอ, เลขที่ใบงาน..." className="pl-9 bg-card" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44 bg-card">
            <Filter size={14} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="ประเภทคำขอ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกประเภทคำขอ</SelectItem>
            <SelectItem value="Repair">🛠️ แจ้งซ่อมอุปกรณ์</SelectItem>
            <SelectItem value="Move">📦 เคลื่อนย้ายอุปกรณ์</SelectItem>
            <SelectItem value="Edit">✏️ แก้ไขข้อมูล</SelectItem>
            <SelectItem value="Delete">🗑️ ลบอุปกรณ์จากระบบ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ตารางแสดงรายการ */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed rounded-xl text-muted-foreground">
          <ClipboardCheck size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">ไม่มีรายการที่รอการอนุมัติในขณะนี้</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">เลขที่ใบงาน</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">ประเภทคำขอ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">อุปกรณ์</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">รายละเอียดคำขอ / เหตุผล</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-32">ผู้ส่งคำขอ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-24">ความเร่งด่วน</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide w-44">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => {
                  const type = typeDetails[item.request_type] || { label: item.request_type, bg: 'rgba(0,0,0,0.05)', color: '#000', icon: ClipboardCheck };
                  const TypeIcon = type.icon;
                  const pc = priorityColors[item.priority] || priorityColors.Low;

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.ticket_no || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: type.bg, color: type.color }}>
                          <TypeIcon size={12} />
                          {type.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{item.device_name}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={item.description}>
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.requested_by || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: pc.bg, color: pc.color }}>
                          {item.priority || 'Medium'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <Button 
                            size="sm" 
                            className="h-7 text-xs bg-emerald-600 text-white hover:bg-emerald-700 gap-1 rounded-md px-2.5 shadow-sm"
                            onClick={() => handleApprove(item)}
                            disabled={submitting}
                          >
                            <Check size={12} />
                            อนุมัติ
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline" 
                            className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-1 rounded-md px-2.5"
                            onClick={() => setActionItem(item)}
                            disabled={submitting}
                          >
                            <X size={12} />
                            ปฏิเสธ
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
      )}

      {/* 📐 Dialog กรอกเหตุผลการปฏิเสธอนุมัติ */}
      <Dialog open={!!actionItem} onOpenChange={() => { if(!submitting) setActionItem(null); }}>
        <DialogContent className="max-w-md bg-background border shadow-xl sm:rounded-2xl p-5 flex flex-col overflow-hidden">
          <DialogHeader className="border-b pb-3 shrink-0">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-1.5">
              <AlertCircle size={16} className="text-red-500" />
              <span>ระบุเหตุผลการปฏิเสธอนุมัติ</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 my-3 space-y-3 overflow-hidden w-full">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-foreground/80">
                เหตุผลที่ไม่นุมัติคำขอประเภท ({typeDetails[actionItem?.request_type]?.label || '—'})
              </Label>
              <Input 
                placeholder="ระบุเหตุผล เช่น ข้อมูลเอกสารไม่ชัดเจน / ไม่อนุญาตให้ย้ายอุปกรณ์ชั่วคราว..." 
                value={rejectNotes} 
                onChange={e => setRejectNotes(e.target.value)}
                className="h-9 text-xs rounded-md mt-1"
              />
              <div className="min-h-[14px]" /> 
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3 shrink-0">
            <Button 
              variant="outline" 
              className="h-8 text-xs rounded-lg px-4" 
              onClick={() => { setRejectNotes(''); setActionItem(null); }}
              disabled={submitting}
            >
              ยกเลิก
            </Button>
            <Button 
              variant="destructive"
              className="h-8 text-xs rounded-lg px-5 font-semibold" 
              onClick={handleRejectSubmit} 
              disabled={submitting}
            >
              {submitting ? 'กำลังบันทึก...' : 'ยืนยันปฏิเสธ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}