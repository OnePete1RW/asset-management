import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Pencil, Trash2, Wrench, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    const { data } = await supabase.from('repairs').select('*').order('created_at', { ascending: false });
    setRepairs(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = repairs.filter(r => {
    const matchSearch = !search || r.device_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.reported_by?.toLowerCase().includes(search.toLowerCase()) ||
      r.ticket_no?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ ...emptyForm, ...item }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, repair_cost: form.repair_cost ? Number(form.repair_cost) : null };
    if (!payload.reported_date) payload.reported_date = null;
    if (!payload.completed_date) payload.completed_date = null;
    if (editItem) {
      await supabase.from('repairs').update(payload).eq('id', editItem.id);
    } else {
      await supabase.from('repairs').insert(payload);
    }
    await load();
    setDialogOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await supabase.from('repairs').delete().eq('id', id);
    setDeleteId(null);
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-heading">Repair</h2>
          <p className="text-muted-foreground text-sm mt-0.5">จัดการงานซ่อม IT ({repairs.length} รายการ)</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus size={16} /> เพิ่มงานซ่อม
        </Button>
      </div>

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
                      <td className="px-4 py-3 font-medium text-foreground">{r.device_name}</td>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'แก้ไขงานซ่อม' : 'เพิ่มงานซ่อมใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {[
              { key: 'ticket_no', label: 'เลขที่ใบแจ้งซ่อม' },
              { key: 'device_name', label: 'ชื่ออุปกรณ์ *' },
              { key: 'reported_by', label: 'ผู้แจ้ง' },
              { key: 'technician', label: 'ช่างซ่อม' },
              { key: 'repair_cost', label: 'ค่าซ่อม (บาท)', type: 'number' },
              { key: 'reported_date', label: 'วันที่แจ้ง', type: 'date' },
              { key: 'completed_date', label: 'วันที่ซ่อมเสร็จ', type: 'date' },
            ].map(({ key, label, type = 'text' }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs">ความเร่งด่วน</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">สถานะ</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">อาการเสีย *</Label>
              <Input value={form.issue_description || ''} onChange={e => setForm(f => ({ ...f, issue_description: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">หมายเหตุ</Label>
              <Input value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
          </div>
        </DialogContent>
      </Dialog>

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