import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Monitor,
  Filter
} from "lucide-react";
const statusColors = {
  Available: { bg: 'rgba(16,185,129,0.12)', color: '#0b0c0c' },
  'In Use': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  'Under Repair': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  'Rented Out': { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
  Retired: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
};

const categories = ['Laptop', 'Desktop', 'Monitor', 'Printer', 'Network', 'Server', 'Mobile', 'Tablet', 'Other'];
const statuses = ['Available', 'In Use', 'Under Repair', 'Rented Out', 'Retired'];
const departments = [
  "Management Department",
  "Human Resources & Administration Department",
  "Accounting Department",
  "Finance Department",
  "Information Technology Department",
  "Sales Department",
  "Modern Trade & Online Sales Department",
  "International Business Department / Export Department",
  "Procurement Department / Purchasing Department",
  "Delivery Department / Distribution Department",
  "Shipping Department / Import-Export Logistics",
  "Warehouse Department",
  "Production Department / Manufacturing Department",
  "Research & Development Department",
  "Quality Control Department",
  "Product Registration & Document Control Department",
  "Graphic Design Department",
];
const emptyForm = {
  asset_tag: '',
  name: '',
  category: '',
  brand: '',
  model: '',
  serial_number: '',
  status: '',
  assigned_to: '',
  department: '',
  purchase_date: '',
  purchase_price: '',
  warranty_expire: '',
  notes: '',
  image_url: '',
};

export default function Device() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [errors, setErrors] = useState({});
  const [detailItem, setDetailItem] = useState(null);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const load = async () => {
    const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    setDevices(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = devices.filter((d) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      !search ||
      d.name?.toLowerCase().includes(keyword) ||
      d.asset_tag?.toLowerCase().includes(keyword) ||
      d.brand?.toLowerCase().includes(keyword) ||
      d.department?.toLowerCase().includes(keyword) ||
      d.assigned_to?.toLowerCase().includes(keyword);

    const matchStatus =
      filterStatus === "all" ||
      d.status === filterStatus;

    const matchDepartment =
      filterDepartment === "all" ||
      d.department === filterDepartment;

    return (
      matchSearch &&
      matchStatus &&
      matchDepartment
    );
  });

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);

    setForm({
      ...emptyForm,
      ...item,
      purchase_price: item.purchase_price?.toString() || "",
    });

    setDialogOpen(true);
  };

  const handleSave = async () => {

    const newErrors = {};
    if (!form.asset_tag?.trim()) {
      newErrors.asset_tag = "กรุณากรอก Asset Tag";
    }
    if (!form.brand?.trim()) {
      newErrors.brand = "กรุณากรอกยี่ห้อ";
    }
    if (!form.model?.trim()) {
      newErrors.model = "กรุณากรอกรุ่น";
    }
    if (!form.serial_number?.trim()) {
      newErrors.serial_number = "กรุณากรอก Serial Number";
    }
    if (!form.assigned_to?.trim()) {
      newErrors.assigned_to = "กรุณากรอกมอบหมายให้";
    }
    if (!form.name?.trim()) {
      newErrors.name = "กรุณากรอกชื่ออุปกรณ์";
    }
    if (
      form.purchase_price === "" ||
      form.purchase_price === null ||
      form.purchase_price === undefined
    ) {
      newErrors.purchase_price = "กรุณากรอกราคา";
    }
    if (!form.purchase_date?.trim()) {
      newErrors.purchase_date = "กรุณากรอกวันที่ซื้อ";
    }
    if (!form.warranty_expire?.trim()) {
      "กรุณากรอกวันหมดประกัน";
      newErrors.warranty_expire = "กรุณากรอกวันหมดประกัน";
    }
    if (!form.category) {
      newErrors.category = "กรุณาเลือกประเภท";
    }

    if (!form.department) {
      newErrors.department = "กรุณาเลือกแผนก";
    }

    if (!form.status) {
      newErrors.status = "กรุณาเลือกสถานะ";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setSaving(true);

    const payload = {
      ...form,
      purchase_price: form.purchase_price
        ? Number(form.purchase_price)
        : null
    };

    if (!payload.purchase_date) payload.purchase_date = null;
    if (!payload.warranty_expire) payload.warranty_expire = null;

    if (editItem) {
      await supabase
        .from("devices")
        .update(payload)
        .eq("id", editItem.id);
    } else {
      await supabase
        .from("devices")
        .insert(payload);
    }

    await load();
    setDialogOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await supabase.from('devices').delete().eq('id', id);
    setDeleteId(null);
    await load();
  };
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const fileName = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("device-images")
      .upload(fileName, file);

    if (error) {
      alert(error.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("device-images")
      .getPublicUrl(fileName);

    setForm((prev) => ({
      ...prev,
      image_url: publicUrl,
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-heading">Device</h2>
          <p className="text-muted-foreground text-sm mt-0.5">จัดการอุปกรณ์ IT ทั้งหมด ({devices.length} รายการ)</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus size={16} /> เพิ่มอุปกรณ์
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่อ, asset tag, ยี่ห้อ..." className="pl-9 bg-card" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <Select
            value={filterDepartment}
            onValueChange={setFilterDepartment}
          >
            <SelectTrigger className="w-64 bg-card">
              <SelectValue placeholder="แผนก" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                ทุกแผนก
              </SelectItem>

              {departments.map((dept) => (
                <SelectItem
                  key={dept}
                  value={dept}
                >
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Monitor size={40} className="mx-auto mb-3 opacity-30" />
          <p>ไม่พบข้อมูลอุปกรณ์</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
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
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(d => {
                  const sc = statusColors[d.status] || statusColors.Retired;
                  return (
                    <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.asset_tag || '—'}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.department || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.assigned_to || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: sc.bg, color: sc.color }}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDetailItem(d)}
                          >
                            <Eye size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(d.id)}>
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCloseConfirmOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">

            {/* Header */}
            <div className="grid md:grid-cols-2 gap-4">

              {/* รูป */}
              <div>

                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt="preview"
                    className="w-full h-64 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center text-5xl text-muted-foreground">
                    <label className="cursor-pointer block mt-3">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />

                      <div className="w-full h-20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center hover:bg-muted/50 transition">
                        <div className="text-center">
                          <div className="text-4xl font-light">+</div>
                          <div className="text-xs text-muted-foreground">
                            เพิ่มรูปภาพ
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                )}



              </div>

              {/* ข้อมูลหลัก */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                <div className="md:col-span-2">
                  <Label>รหัสอุปกรณ์</Label>
                  <Input
                    className="h-10 text-base"
                    value={form.asset_tag}
                    onChange={(e) =>
                      setForm(f => ({
                        ...f,
                        asset_tag: e.target.value
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>ชื่ออุปกรณ์</Label>
                  <Input
                    className="h-10 text-base"
                    value={form.name}
                    onChange={(e) =>
                      setForm(f => ({
                        ...f,
                        name: e.target.value
                      }))
                    }
                  />
                  {errors?.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <Label>รุ่น</Label>
                  <Input
                    className="h-10 text-base"
                    value={form.model}
                    onChange={(e) =>
                      setForm(f => ({
                        ...f,
                        model: e.target.value
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>ยี่ห้อ</Label>
                  <Input
                    className="h-10 text-base"
                    value={form.brand}
                    onChange={(e) =>
                      setForm(f => ({
                        ...f,
                        brand: e.target.value
                      }))
                    }
                  />
                </div>

              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">

              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div>
                  <Label>ผู้รับผิดชอบ</Label>
                  <Input
                    className="h-10 text-base"
                    value={form.assigned_to}
                    onChange={(e) =>
                      setForm(f => ({
                        ...f,
                        assigned_to: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>แผนก</Label>
                  <Select
                    value={form.department}
                    onValueChange={(v) =>
                      setForm(f => ({
                        ...f,
                        department: v
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกแผนก" />
                    </SelectTrigger>

                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem
                          key={d}
                          value={d}
                        >
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>วันที่ซื้อ</Label>
                  <Input
                    className="h-10 text-base"
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) =>
                      setForm(f => ({
                        ...f,
                        purchase_date: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>วันหมดประกัน</Label>
                  <Input
                    type="date"
                    value={form.warranty_expire}
                    onChange={(e) =>
                      setForm(f => ({
                        ...f,
                        warranty_expire: e.target.value
                      }))
                    }
                  />
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div>
                  <Label>Serial Number</Label>
                  <Input
                    className="h-10 text-base"
                    value={form.serial_number}
                    onChange={(e) =>
                      setForm(f => ({
                        ...f,
                        serial_number: e.target.value
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>ราคา</Label>
                  <Input
                    className="h-10 text-base"
                    type="number"
                    value={form.purchase_price}
                    onChange={(e) =>
                      setForm(f => ({
                        ...f,
                        purchase_price: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>สถานะ</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm(f => ({
                        ...f,
                        status: v
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสถานะ" />
                    </SelectTrigger>

                    <SelectContent>
                      {statuses.map(s => (
                        <SelectItem
                          key={s}
                          value={s}
                        >
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>ประเภท</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) =>
                      setForm(f => ({
                        ...f,
                        category: v
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>

                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem
                          key={c}
                          value={c}
                        >
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {errors?.category && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.category}
                    </p>
                  )}
                </div>

              </div>

            </div>

          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={handleSave} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
          </div>
        </DialogContent>
      </Dialog>
<Dialog
  open={closeConfirmOpen}
  onOpenChange={setCloseConfirmOpen}
>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle>ยืนยันการปิด</DialogTitle>
    </DialogHeader>

    <p className="text-sm text-muted-foreground">
      คุณมีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างหรือไม่?
    </p>

    <div className="flex justify-end gap-3 mt-4">
      <Button
        variant="outline"
        onClick={() => setCloseConfirmOpen(false)}
      >
        กลับไปแก้ไข
      </Button>

      <Button
        variant="destructive"
        onClick={() => {
          setCloseConfirmOpen(false);
          setDialogOpen(false);
          setErrors({});
          setForm(emptyForm);
        }}
      >
        ปิดโดยไม่บันทึก
      </Button>
    </div>
  </DialogContent>
</Dialog>

<Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}></Dialog>
      <Dialog
        open={!!detailItem}
        onOpenChange={() => setDetailItem(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รายละเอียดอุปกรณ์</DialogTitle>
          </DialogHeader>

          {detailItem && (
            <div className="space-y-5">

              {/* Header */}
              <div className="grid md:grid-cols-2 gap-4">

                {/* รูป */}
                <div>
                  {detailItem?.image_url ? (
                    <img
                      src={detailItem.image_url}
                      alt={detailItem.name}
                      className="w-full h-64 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center text-6xl text-muted-foreground">
                      IMG
                    </div>
                  )}
                </div>

                {/* ข้อมูลหลัก */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-4">

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">ชื่ออุปกรณ์</p>
                    <p className="font-medium">{detailItem.name || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">รุ่น</p>
                    <p className="font-medium">{detailItem.model || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">ผู้รับผิดชอบ</p>
                    <p className="font-medium">{detailItem.assigned_to || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">ราคา</p>
                    <p className="font-medium">
                      {detailItem.purchase_price
                        ? Number(detailItem.purchase_price).toLocaleString()
                        : "-"}
                    </p>
                  </div>

                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">

                  <div>
                    <p className="text-xs text-muted-foreground">Asset Tag</p>
                    <p className="font-medium">
                      {detailItem.asset_tag || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">ประเภท</p>
                    <p className="font-medium">
                      {detailItem.category || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">ยี่ห้อ</p>
                    <p className="font-medium">
                      {detailItem.brand || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Serial Number</p>
                    <p className="font-medium">
                      {detailItem.serial_number || "-"}
                    </p>
                  </div>

                </div>

                <div className="bg-muted/30 rounded-lg p-4 space-y-3">

                  <div>
                    <p className="text-xs text-muted-foreground">สถานะ</p>
                    <p className="font-medium">
                      {detailItem.status || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">วันที่ซื้อ</p>
                    <p className="font-medium">
                      {detailItem.purchase_date || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">วันหมดประกัน</p>
                    <p className="font-medium">
                      {detailItem.warranty_expire || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">แผนก</p>
                    <p className="font-medium">{detailItem.department || "-"}</p>
                  </div>
                </div>

              </div>
              <div>
                <p className="text-xs text-muted-foreground">หมายเหตุ</p>
                <p className="font-medium">
                  {detailItem.notes || "-"}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="border-t pt-4">
                <div className="flex flex-wrap justify-end gap-3">

                  <Button
                    variant="destructive"
                    onClick={() => {
                      alert("เปิดฟอร์มแจ้งซ่อม");
                    }}
                  >
                    แจ้งซ่อม
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      alert("เปิดฟอร์มเคลื่อนย้าย");
                    }}
                  >
                    เคลื่อนย้าย
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      alert("เปิดฟอร์มยืมอุปกรณ์");
                    }}
                  >
                    ยืมอุปกรณ์
                  </Button>

                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>ยืนยันการลบ</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">คุณต้องการลบอุปกรณ์นี้ใช่หรือไม่? ข้อมูลจะถูกลบถาวร</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteId)}>ลบ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
