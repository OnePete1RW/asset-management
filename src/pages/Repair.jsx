import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Pencil, Trash2, Wrench, Building2, User, AlertCircle } from 'lucide-react';
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

export default function Repair() {
  const [repairs, setRepairs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [repairsRes, devicesRes] = await Promise.all([
      supabase.from('repairs').select('*').order('created_at', { ascending: false }),
      supabase.from('devices').select('id, asset_tag, name, assigned_to')
    ]);

    setRepairs(repairsRes.data || []);
    setDevices(devicesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = repairs.filter(r => {
    const matchedDevice = devices.find(d => d.id === r.device_id);
    const searchStr = search.toLowerCase();
    return (
      r.ticket_no?.toLowerCase().includes(searchStr) ||
      r.device_name?.toLowerCase().includes(searchStr) ||
      matchedDevice?.asset_tag?.toLowerCase().includes(searchStr)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Wrench className="text-primary" /> รายการซ่อมอุปกรณ์</h2>
        <Button onClick={() => setIsModalOpen(true)} className="gap-1.5"><Plus size={16} /> แจ้งซ่อม</Button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหารหัส, ชื่ออุปกรณ์ หรือเลขที่ใบซ่อม..."
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">รหัสอุปกรณ์</th>
              <th className="px-4 py-3 text-left">ชื่ออุปกรณ์</th>
              <th className="px-4 py-3 text-left">ผู้ถือครอง</th>
              <th className="px-4 py-3 text-left">บัญชีผู้ดำเนินการ</th>
              <th className="px-4 py-3 text-left">อาการเสีย / ปัญหา</th>
              <th className="px-4 py-3 text-left">สถานะ</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(r => {
              const d = devices.find(dev => dev.id === r.device_id);
              const sc = statusColors[r.status] || statusColors.Cancelled;
              return (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{d?.asset_tag || '-'}</td>
                  <td className="px-4 py-3 font-medium">{r.device_name || d?.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d?.assigned_to || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.reported_by || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{r.issue_description}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase" style={{ background: sc.bg, color: sc.color }}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status !== 'Completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 gap-1"
                        onClick={async () => {
                          // อัปเดตสถานะเป็น Completed ในฐานข้อมูล
                          await supabase
                            .from('repairs')
                            .update({
                              status: 'Completed',
                              completed_date: new Date().toISOString()
                            })
                            .eq('id', r.id);

                          // โหลดข้อมูลใหม่เพื่ออัปเดตหน้าจอ
                          loadData();
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span className="text-xs">ซ่อมเสร็จแล้ว</span>
                      </Button>
                    )}
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