import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Pencil, Trash2, Wrench, Filter, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import AddRepairModal from '@/components/Repair/AddRepairModal';

const statusColors = {
  Pending: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  'In Progress': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  'Waiting Parts': { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
  Completed: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  Cancelled: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
};

const priorityColors = {
  Low: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
  Medium: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  High: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  Critical: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

const statuses = ['Pending', 'In Progress', 'Waiting Parts', 'Completed', 'Cancelled'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];

const emptyForm = {
  ticket_no: '', device_id: '', device_name: '', reported_by: '', issue_description: '',
  priority: 'Medium', status: 'Pending', technician: '', repair_cost: '', reported_date: '', completed_date: '', notes: '',
};

export default function Repair() {
  const [repairs, setRepairs] = useState([]);
  const [devices, setDevices] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({}); 
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // 🌟 ย้ายมาประกาศรวมกลุ่มด้านบนให้สะอาดตา

  const loadData = async () => {
    setLoading(true);
    const [repairsRes, devicesRes] = await Promise.all([
      supabase.from('repairs').select('*').order('created_at', { ascending: false }),
      supabase.from('devices').select('id, asset_tag, name') 
    ]);

    setRepairs(repairsRes.data || []);
    setDevices(devicesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = repairs.filter(r => {
    const matchSearch = !search || r.device_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.reported_by?.toLowerCase().includes(search.toLowerCase()) ||
      r.ticket_no?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setEditItem(null); setErrors({}); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item) => { setEditItem(item); setErrors({}); setForm({ ...emptyForm, ...item }); setDialogOpen(true); };

  const validateForm = () => {
    const localErrors = {};
    if (!form.device_id) localErrors.device_id = "กรุณาเลือกอุปกรณ์";
    if (!form.issue_description || form.issue_description.trim() === "") {
      localErrors.issue_description = "กรุณากรอกอาการเสีย";
    }
    setErrors(localErrors);
    return Object.keys(localErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return; 

    setSaving(true);
    const payload = { ...form, repair_cost: form.repair_cost ? Number(form.repair_cost) : null };
    if (!payload.reported_date) payload.reported_date = null;
    if (!payload.completed_date) payload.completed_date = null;

    if (editItem) {
      await supabase.from('repairs').update(payload).eq('id', editItem.id);
    } else {
      await supabase.from('repairs').insert(payload);
    }
    await loadData();
    setDialogOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await supabase.from('repairs').delete().eq('id', id);
    setDeleteId(null);
    await loadData();
  };

  const handleDeviceChange = (deviceId) => {
    const selectedDevice = devices.find(d => d.id === deviceId);
    if (selectedDevice) {
      setForm(f => ({
        ...f,
        device_id: deviceId,
        device_name: `${selectedDevice.name} (${selectedDevice.asset_tag})` 
      }));
      setErrors(prev => ({ ...prev, device_id: "" }));
    }
  };

  return (
    <div className="space-y-5">
      {/* 🟢 ส่วนหัวและปุ่มสร้างใบซ่อม */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Wrench /> รายการซ่อมอุปกรณ์</h2>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-1.5">
          <Plus size={16} />
          <span>แจ้งซ่อมอุปกรณ์</span>
        </Button>
      </div>

      {/* 🔍 แผงควบคุม ค้นหา และ คัดกรอง */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่ออุปกรณ์, ผู้แจ้ง, เลขที่..." className="pl-9 bg-card" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-card">
            <Filter size={14} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* 📊 ตารางแสดงรายการงานซ่อม */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Wrench size={40} className="mx-auto mb-3 opacity-30" />
          <p>ไม่พบข้อมูลงานซ่อม</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">เลขที่</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">อุปกรณ์</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">อาการเสีย</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ผู้แจ้ง</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ความเร่งด่วน</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">สถานะ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(r => {
                  const sc = statusColors[r.status] || statusColors.Cancelled;
                  const pc = priorityColors[r.priority] || priorityColors.Low;
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.ticket_no || '—'}</td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div>{r.device_name}</div>
                        {r.notes && r.status === 'Cancelled' && (
                          <div className="text-[11px] text-red-500 font-medium truncate max-w-xs">{r.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{r.issue_description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.reported_by || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: pc.bg, color: pc.color }}>
                          {r.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: sc.bg, color: sc.color }}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(r.id)}>
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
      )}

      {/* 📦 Component ใบแจ้งซ่อมแยกส่วนที่เราเรียกใช้งาน */}
      <AddRepairModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadData} 
      />

      {/* 📐 Dialog แก้ไขข้อมูลจากปุ่มรูปดินสอภายในตาราง */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-background border shadow-xl sm:rounded-2xl p-5 flex flex-col overflow-hidden">
          <DialogHeader className="border-b pb-3 shrink-0">
            <DialogTitle className="text-base font-bold text-foreground">{editItem ? 'แก้ไขงานซ่อม' : 'เพิ่มงานซ่อมใหม่'}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 my-3 overflow-hidden w-full">
            <div className="grid grid-cols-2 gap-x-5 gap-y-0.5">
              
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground/80">เลขที่ใบแจ้งซ่อม</Label>
                <Input placeholder="เช่น REPAIR-2026-001" value={form.ticket_no || ''} onChange={e => setForm(f => ({ ...f, ticket_no: e.target.value }))} className="h-8 text-xs rounded-md" />
                <div className="min-h-[16px]" /> 
              </div>

              <div className="space-y-1">
                <Label className={`text-[11px] font-bold ${errors.device_id ? "text-red-500" : "text-foreground/80"}`}>เลือกอุปกรณ์จากระบบ *</Label>
                <Select value={form.device_id || ""} onValueChange={handleDeviceChange}>
                  <SelectTrigger className={`h-8 text-xs rounded-md ${errors.device_id ? "border-red-500 text-red-500 bg-red-50/20" : ""}`}>
                    <SelectValue placeholder="เลือกอุปกรณ์ในระบบ" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map(d => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.name} ({d.asset_tag})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-0.5 min-h-[16px] flex items-center gap-1 text-red-500">
                  {errors.device_id && (
                    <>
                      <AlertCircle size={10} className="shrink-0" />
                      <p className="text-[10px] font-semibold leading-none">{errors.device_id}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground/80">ผู้แจ้ง</Label>
                <Input value={form.reported_by || ''} onChange={e => setForm(f => ({ ...f, reported_by: e.target.value }))} className="h-8 text-xs rounded-md" />
                <div className="min-h-[16px]" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground/80">ช่างซ่อม</Label>
                <Input value={form.technician || ''} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} className="h-8 text-xs rounded-md" />
                <div className="min-h-[16px]" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground/80">ค่าซ่อม (บาท)</Label>
                <Input type="number" value={form.repair_cost || ''} onChange={e => setForm(f => ({ ...f, repair_cost: e.target.value }))} className="h-8 text-xs rounded-md" />
                <div className="min-h-[16px]" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground/80">ความเร่งด่วน</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-8 text-xs rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>{priorities.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
                </Select>
                <div className="min-h-[16px]" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground/80">วันที่แจ้ง</Label>
                <Input type="date" value={form.reported_date || ''} onChange={e => setForm(f => ({ ...f, reported_date: e.target.value }))} className="h-8 text-xs rounded-md font-mono" />
                <div className="min-h-[16px]" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground/80">วันที่ซ่อมเสร็จ</Label>
                <Input type="date" value={form.completed_date || ''} onChange={e => setForm(f => ({ ...f, completed_date: e.target.value }))} className="h-8 text-xs rounded-md font-mono" />
                <div className="min-h-[16px]" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground/80">สถานะ</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 text-xs rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                </Select>
                <div className="min-h-[16px]" />
              </div>
              <div className="min-h-[1px]" />

              <div className="col-span-2 space-y-1">
                <Label className={`text-[11px] font-bold ${errors.issue_description ? "text-red-500" : "text-foreground/80"}`}>อาการเสีย *</Label>
                <Input value={form.issue_description || ''} onChange={e => setForm(f => ({ ...f, issue_description: e.target.value }))} className={`h-8 text-xs rounded-md ${errors.issue_description ? "border-red-500 bg-red-50/20" : ""}`} />
                <div className="mt-0.5 min-h-[16px] flex items-center gap-1 text-red-500">
                  {errors.issue_description && (
                    <>
                      <AlertCircle size={10} className="shrink-0" />
                      <p className="text-[10px] font-semibold leading-none">{errors.issue_description}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-[11px] font-bold text-foreground/80">หมายเหตุ</Label>
                <Input value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-8 text-xs rounded-md" />
                <div className="min-h-[12px]" />
              </div>

            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3 shrink-0">
            <Button variant="outline" className="h-8 text-xs rounded-lg px-4" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button className="h-8 text-xs rounded-lg px-5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🗑️ Dialog ยืนยันการลบ */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>ยืนยันการลบ</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">คุณต้องการลบงานซ่อมนี้ใช่หรือไม่?</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteId)}>ลบ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}