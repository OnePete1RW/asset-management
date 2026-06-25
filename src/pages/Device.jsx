import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DeviceTable from '@/components/Device/DeviceTable';
import DeviceFormDialog from '@/components/Device/DeviceFormDialog';
import CloseConfirmDialog from '@/components/Device/CloseConfirmDialog';
import DeviceDetailDialog from '@/components/Device/DeviceDetailDialog';
import DeleteConfirmDialog from '@/components/Device/DeleteConfirmDialog';
import { Plus, Search, Filter } from "lucide-react";
import DeviceEditDialog from '@/components/Device/DeviceEditDialog';

// 1. ชุดสีพาสเทลสำหรับสถานะต่างๆ บนตารางหลัก
const statusColors = {
  'ใช้งาน': { bg: '#E0F2FE', color: '#000000' },
  'สำรอง': { bg: '#DCFCE7', color: '#000000' },
  'กำลังซ่อม': { bg: '#FEF3C7', color: '#000000' },
  'รออนุมัติส่งซ่อม': { bg: '#FFE4E6', color: '#9F1239' },
  'ยืม': { bg: '#F3E8FF', color: '#000000' },
  'เสีย': { bg: '#F1F5F9', color: '#000000' },
  'รออนุมัติลบ': { bg: '#FFE4E6', color: '#9F1239' }
};

const categories = ['Laptop', 'Desktop', 'Monitor', 'Printer', 'Network', 'Server', 'Mobile', 'Tablet', 'Other'];
const statuses = ['สำรอง', 'ใช้งาน', 'รออนุมัติส่งซ่อม', 'กำลังซ่อม', 'ยืม', 'เสีย'];
const departments = [
  "Management", "Human Resources", "Admin", "Accounting", "Finance",
  "Information Technology", "Sales", "Modern & Online Trade",
  "International Business", "Export", "Procurement", "Purchasing",
  "Delivery", "Shipping", "Import-Export Logistics", "Warehouse ",
  "Production", "Research & Development", "Quality Control ",
  "Registration & Document Control", "Graphic Design",
];

const emptyForm = {
  asset_tag: '', name: '', category: '', brand: '', model: '',
  serial_number: '', status: '', assigned_to: '', department: '',
  purchase_date: '', purchase_price: '', warranty_expire: '', notes: '', image_url: '',
};

export default function Device() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [editItem, setEditItem] = useState(null); // ใช้เช็กว่ากำลังแก้ไขเครื่องไหน (null = ปิด Dialog แก้ไข)
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [errors, setErrors] = useState({});
  const [detailItem, setDetailItem] = useState(null);
  const [focusField, setFocusField] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    setDevices(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = devices.filter((d) => {
    const keyword = search.toLowerCase();
    const matchSearch = !search ||
      d.name?.toLowerCase().includes(keyword) ||
      d.asset_tag?.toLowerCase().includes(keyword) ||
      d.brand?.toLowerCase().includes(keyword) ||
      d.department?.toLowerCase().includes(keyword) ||
      d.assigned_to?.toLowerCase().includes(keyword);

    const matchStatus = filterStatus === "all" || d.status === filterStatus;
    const matchDepartment = filterDepartment === "all" || d.department === filterDepartment;

    return matchSearch && matchStatus && matchDepartment;
  });

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      ...emptyForm,
      ...item,
      purchase_price: item.purchase_price?.toString() || "",
      original_asset_tag: item.asset_tag || "",
      original_name: item.name || "",
      original_category: item.category || "",
      original_status: item.status || "",
      original_assigned_to: item.assigned_to || "",
      original_department: item.department || "",
      original_purchase_date: item.purchase_date || "",
      original_warranty_expire: item.warranty_expire || "",
    });
  };

  const handleSave = async () => {
    const newErrors = {};
    if (!form.asset_tag?.trim()) newErrors.asset_tag = "กรุณากรอก Asset Tag";
    if (!form.assigned_to?.trim()) newErrors.assigned_to = "กรุณากรอกมอบหมายให้";
    if (!form.name?.trim()) newErrors.name = "กรุณากรอกชื่ออุปกรณ์";
    if (!form.purchase_date?.trim()) newErrors.purchase_date = "กรุณากรอกวันที่ซื้อ";
    if (!form.warranty_expire?.trim()) newErrors.warranty_expire = "กรุณากรอกวันหมดประกัน";
    if (!form.category) newErrors.category = "กรุณาเลือกประเภท";
    if (!form.department) newErrors.department = "กรุณาเลือกแผนก";
    if (!form.status) newErrors.status = "กรุณาเลือกสถานะ";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);

    const payload = {
      asset_tag: form.asset_tag,
      name: form.name,
      category: form.category,
      department: form.department,
      assigned_to: form.assigned_to,
      status: form.status,
      image_url: form.image_url || null,
      notes: form.notes || null,
      purchase_date: form.purchase_date || null,
      warranty_expire: form.warranty_expire || null,
    };

    let result;
    if (editItem) {
      result = await supabase.from("devices").update(payload).eq("id", editItem.id);
    } else {
      result = await supabase.from("devices").insert([payload]);
    }

    if (result.error) {
      console.error(result.error);
      alert(result.error.message);
      setSaving(false);
      return;
    }

    await load();
    setDialogOpen(false);
    setEditItem(null); // ปิดหน้าต่าง Edit มื่อบันทึกเสร็จ
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!id) return;

    const targetDevice = devices.find(d => d.id === id);
    if (!targetDevice) return;

    const { error: approvalError } = await supabase
      .from('approvals')
      .insert([
        {
          device_id: targetDevice.id,
          device_name: targetDevice.name,
          request_type: 'Delete',
          status: 'Pending',
          requested_by: targetDevice.assigned_to || 'ไม่ระบุผู้ส่ง',
          description: `ขออนุมัติลบอุปกรณ์: ${targetDevice.asset_tag || '—'}`,
          priority: 'Medium'
        }
      ]);

    if (approvalError) {
      console.error("Error creating approval request:", approvalError.message);
      alert("ไม่สามารถสร้างคำขออนุมัติได้: " + approvalError.message);
      return;
    }

    const { error: deviceError } = await supabase
      .from('devices')
      .update({ status: 'รออนุมัติลบ' })
      .eq('id', id);

    if (!deviceError) {
      setDevices(prevDevices =>
        prevDevices.map(device =>
          device.id === id ? { ...device, status: 'รออนุมัติลบ' } : device
        )
      );
      setDeleteId(null);
    } else {
      console.error("Error updating device status:", deviceError.message);
      alert("ไม่สามารถอัปเดตสถานะอุปกรณ์ได้: " + deviceError.message);
    }
  };

  // 💡 ฟังก์ชันจำลองเมื่อกดปุ่มเมนูด่วนในกล่องจัดสินทรัพย์
  const handleRepair = () => alert("ส่งคำขอแจ้งซ่อมสำเร็จ (จำลองฟังก์ชัน)");
  const handleTransfer = () => alert("เปิดเมนูเคลื่อนย้ายแผนกสำเร็จ (จำลองฟังก์ชัน)");
  const handleBorrow = () => alert("เปิดเมนูยืม/คืนอุปกรณ์สำเร็จ (จำลองฟังก์ชัน)");

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
          <Input placeholder="ค้นหาชื่อ, asset tag, ยี่ห้อ..." className="pl-9 h-10 w-full" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filter แผนก */}
        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-64 bg-card">
            <SelectValue placeholder="แผนก" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกแผนก</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter สถานะ */}
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

      <div>
        {/* 🛠️ แก้ไขพรอพตรงนี้ จาก openEdit เป็น setEditItem เพื่อแมปคำสั่งจากตารางให้ตรงกัน */}
        <DeviceTable
          loading={loading}
          filtered={filtered}
          statusColors={statusColors}
          setDetailItem={setDetailItem}
          setEditItem={openEdit}
          setDeleteId={setDeleteId}
        />
      </div>

      {/* 🛠️ ปรับเปลี่ยนการแมปพรอพภายในจุดนี้ให้เชื่อมโยงสเตทได้ถูกต้องแม่นยำ */}
      <DeviceEditDialog
        isOpen={editItem !== null}
        setIsOpen={(open) => !open && setEditItem(null)}
        form={form} 
        setForm={setForm}
        errors={errors}
        setErrors={setErrors}
        focusField={focusField}
        setFocusField={setFocusField}
        saving={saving}
        handleSave={handleSave}
        categories={categories}
        statuses={statuses}
        departments={departments}
        onRepairClick={handleRepair}
        onTransferClick={handleTransfer}
        onBorrowClick={handleBorrow}
      />

      <DeviceFormDialog
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        form={form}
        setForm={setForm}
        errors={errors}
        setErrors={setErrors}
        focusField={focusField}
        setFocusField={setFocusField}
        saving={saving}
        handleSave={handleSave}
        setCloseConfirmOpen={setCloseConfirmOpen}
        categories={categories}
        statuses={statuses}
        departments={departments}
      />

      <CloseConfirmDialog
        isOpen={closeConfirmOpen}
        setIsOpen={setCloseConfirmOpen}
        setDialogOpen={setDialogOpen}
        setErrors={setErrors}
        setForm={setForm}
        emptyForm={emptyForm}
      />

      <DeviceDetailDialog
        isOpen={!!detailItem}
        setIsOpen={(open) => !open && setDetailItem(null)}
        detailItem={detailItem}
      />

      <DeleteConfirmDialog
        deleteId={deleteId}
        setDeleteId={setDeleteId}
        handleDelete={handleDelete}
      />
    </div>
  );
}