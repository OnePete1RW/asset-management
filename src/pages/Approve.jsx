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
  const [actionItem, setActionItem] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ดึงข้อมูลคำขอที่สถานะยังเป็น 'Pending' (รออนุมัติ)
  const loadApprovals = async () => {
    try {
      setLoading(true);

      // 1. ดึงคำขอทั้งหมดที่รออนุมัติ
      const { data: approvalsData, error: appErr } = await supabase
        .from('approvals')
        .select('*')
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });

      if (appErr) throw appErr;

      // 2. ดึงข้อมูลอุปกรณ์ทั้งหมดมาเพื่อเอาไป Map ข้อมูล (เลือกเฉพาะคอลัมน์ที่ต้องใช้)
      const { data: devicesData } = await supabase
        .from('devices')
        .select('id, asset_tag, name, assigned_to');

      // 3. รวมข้อมูลด้วย JavaScript (เชื่อมข้อมูลโดยใช้ device_id)
      const combinedData = approvalsData.map(app => {
        const relatedDevice = devicesData?.find(dev => dev.id === app.device_id);
        return {
          ...app,
          devices: relatedDevice || null // ถ้าหาไม่เจอให้เป็น null
        };
      });

      setApprovals(combinedData);
    } catch (err) {
      console.error("Error loading:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  // ค้นหาและคัดกรองข้อมูลในฝั่ง Client
  const filtered = approvals.filter(item => {
    const matchSearch = !search ||
      item.device_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.requested_by?.toLowerCase().includes(search.toLowerCase()) ||
      item.ticket_no?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || item.request_type === filterType;
    return matchSearch && matchType;
  });

  // ฟังก์ชันกด "อนุมัติ"
  // ฟังก์ชันเดียวสำหรับอนุมัติ
  const handleApprove = async (item) => {
    try {
      setSubmitting(true);

      // 1. อัปเดตสถานะในตาราง approvals
      const { error: approveErr } = await supabase
        .from('approvals')
        .update({ status: 'Approved' })
        .eq('id', item.id);
      if (approveErr) throw approveErr;

      // 2. จัดการตาราง devices ตามประเภท
      if (item.request_type === 'Repair') {
        await supabase.from('devices').update({ status: 'กำลังซ่อม' }).eq('id', item.device_id);
      } else if (item.request_type === 'Move') {
        await supabase.from('devices').update({ location: item.new_location }).eq('id', item.device_id);
      } else if (item.request_type === 'Delete') {
        // *** จุดสำคัญ: ตรงนี้คือที่ที่คุณต้องการให้ข้อมูลหายไป ***
        // ถ้าต้องการ "ลบออกจากระบบจริง" ให้ใช้:
        await supabase.from('devices').delete().eq('id', item.device_id);

        // หรือถ้าต้องการแค่ "เปลี่ยนสถานะว่าลบแล้ว" ให้ใช้:
        // await supabase.from('devices').update({ status: 'Deleted' }).eq('id', item.device_id);
      }

      // 3. เอาออกจากหน้าจอ
      setApprovals(prev => prev.filter(req => req.id !== item.id));

    } catch (err) {
      console.error("Approve failed:", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ฟังก์ชันส่งข้อมูล "ปฏิเสธ/ไม่อนุมัติ" (มีอันเดียว ไม่ซ้ำแล้ว)
  // const handleRejectSubmit = async () => {
  //   if (!actionItem) return;

  //   try {
  //     setSubmitting(true);

  //     // 1. อัปเดตตารางอนุมัติเป็น Rejected
  //     await supabase
  //       .from('approvals')
  //       .update({ status: 'Rejected', notes: rejectNotes || 'ปฏิเสธการอนุมัติ' })
  //       .eq('id', actionItem.id);

  //     // 2. คืนค่าสถานะอุปกรณ์ให้กลับไปเป็นแบบเดิม
  //     if (actionItem.request_type === 'Move') {
  //       // คืนค่าแผนกเดิม (ถ้าใน approvals คุณเก็บ previous_dept ไว้)
  //       await supabase.from('devices')
  //         .update({ department: actionItem.previous_dept })
  //         .eq('id', actionItem.device_id);

  //     } else if (actionItem.request_type === 'Repair') {
  //       // ถ้าปฏิเสธการซ่อม ให้คืนสถานะเป็น 'ใช้งาน' (หรือสถานะปกติ)
  //       await supabase.from('devices')
  //         .update({ status: 'ใช้งาน' })
  //         .eq('id', actionItem.device_id);
  //     }
  //     // เพิ่มเงื่อนไขอื่นๆ ตามต้องการ...

  //     setMessage("ปฏิเสธคำขอและคืนสถานะอุปกรณ์เรียบร้อยแล้ว");
  //     setRejectNotes('');
  //     setActionItem(null);
  //     await loadApprovals();
  //   } catch (err) {
  //     setMessage("เกิดข้อผิดพลาด: " + err.message);
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };
const handleRejectDirect = async (item) => {
  setSubmitting(true); // เปลี่ยนสถานะให้ปุ่มขึ้นว่า "กำลังบันทึก"

  try {
    // 1. อัปเดตสถานะการอนุมัติ
    // (ถ้ายังไม่มีคอลัมน์ status ให้ใช้การ .delete() แทนตามที่คุยกันครับ)
    await supabase
      .from('approvals')
      .delete() // ถ้าไม่มี status ให้ใช้ delete เพื่อจบรายการ
      .eq('id', item.id);

    // 2. คืนค่าสถานะอุปกรณ์กลับไปเป็น 'ใช้งาน' หรือค่าเดิม
    await supabase
      .from('devices')
      .update({ status: 'ใช้งาน' }) 
      .eq('id', item.device_id);

    // 3. รีเฟรชหน้าตาราง
    await loadApprovals();
    
    // แจ้งเตือนสั้นๆ (ถ้ามีระบบ Toast)
    // setMessage("ปฏิเสธรายการสำเร็จ");
  } catch (err) {
    console.error("Error:", err);
    alert("เกิดข้อผิดพลาดในการปฏิเสธ");
  } finally {
    setSubmitting(false); // ปิดสถานะการโหลด
  }
};
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
    loadApprovals();
  }, [])
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
            ศูนย์รวมคำขอ แจ้งซ่อม, ลบ, แก้ไข และเคลื่อนย้ายอุปกรณ์ที่รอการตรวจสอบ ({filtered.length} รายการ)
          </p>
        </div>
      </div>

      {/* แถบค้นหาและฟิลเตอร์ */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่ออุปกรณ์, ผู้ขอ..." className="pl-9 h-10 w-full" value={search} onChange={e => setSearch(e.target.value)} />
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">รหัสอุปกรณ์</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">ชื่ออุปกรณ์</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">ผู้ถือครอง</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">บัญชีผู้ดำเนินการ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">ประเภททำรายการ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => {
                  const type = typeDetails[item.request_type] || { label: item.request_type, color: '#6b7280' };

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{item.devices?.asset_tag || '—'}</td>
                      <td className="px-4 py-3 text-foreground">{item.devices?.name || item.device_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.devices?.assigned_to || '—'}</td>

                      {/* บัญชีผู้ดำเนินการ */}
                      <td className="px-4 py-3 text-sm text-foreground">{user?.email || 'System'}</td>

                      {/* ประเภททำรายการ (แยกออกมาตาม image_213707.png) */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-blue-600 uppercase">{type.label}</span>
                          <span className="text-xs text-muted-foreground">{item.description || 'ไม่มีรายละเอียด'}</span>
                        </div>
                      </td>

                      {/* การจัดการ */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(item)}>
                            <Check size={12} className="mr-1" /> อนุมัติ
                          </Button>
                          {/* เปลี่ยนจาก setActionItem เป็นการเรียกฟังก์ชันโดยตรง */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-600 border-red-200"
                            onClick={() => handleRejectDirect(item)} // เรียกฟังก์ชันใหม่ที่ไม่มี Dialog
                            disabled={submitting} // ปุ่มจะกดซ้ำไม่ได้ขณะกำลังบันทึก
                          >
                            {submitting ? 'กำลังปฏิเสธ...' : <><X size={12} className="mr-1" /> ปฏิเสธ</>}
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
    </div>
  );
}