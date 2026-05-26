import { Bot, BrainCircuit, Cpu, GitBranch, Map, Network, Route, ShieldAlert, Target, Workflow } from 'lucide-react';
import IconTile from '../components/common/IconTile';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import StatusBadge from '../components/common/StatusBadge';

const hardware = [
  ['ESP32-S3', 'Nhận khung hình camera, gửi dữ liệu đo lường từ xa, giao tiếp với WMS/AI Server.'],
  ['Arduino UNO R3', 'Điều khiển động cơ, cảm biến hồng ngoại, cảm biến siêu âm và servo.'],
  ['L298N', 'Module điều khiển động cơ DC trái/phải.'],
  ['OV2640 Camera', 'Chụp khung hình để nhận diện hàng hóa/người/vật cản.'],
];

const software = [
  ['WMS Website', 'Bảng điều khiển cho người vận hành, kiểm soát nhiệm vụ, bản đồ, cảnh báo và nhật ký.'],
  ['FastAPI AI Server', 'Nhận khung hình, chạy YOLO/OpenCV, phát báo cáo nhận diện.'],
  ['Dijkstra Planner', 'Tính toán lộ trình ngắn nhất trên bản đồ topo.'],
  ['Realtime Telemetry', 'Cung cấp trạng thái robot, giá trị cảm biến và các quy tắc cảnh báo.'],
];

const timeline = [
  'Người điều h · nh tạo nhiệm vụ giao hàng',
  'WMS nhận diện hàng hóa và lập lộ trình',
  'Dijkstra trả về đường dẫn đỉnh ngắn nhất',
  'WMS gửi lệnh đến ESP32-S3',
  'Robot bám vạch và cập nhật dữ liệu từ xa',
  'AI Server kiểm tra con người/vật cản từ camera',
  'Robot thả hàng và lưu nhật ký kết quả nhiệm vụ',
];

export default function ProjectIntroPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Giới Thiệu Dự Án"
        description="Trang giới thiệu nghiên cứu cho Hệ thống Robot WMS Tự động."
      />

      <section className="rounded-3xl border border-[#E2E8F0] bg-gradient-to-br from-white to-[#F8FAFC] p-8 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <StatusBadge tone="blue">Đề tài nghiên cứu khoa học</StatusBadge>
            <h1 className="mt-4 max-w-4xl text-3xl font-bold leading-tight text-[#0F172A] md:text-4xl">
              Thiết kế mô hình robot tự hành trong quản lý kho
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#64748B]">
              Dự án nghiên cứu cách một AGV nhỏ có thể điều hướng trong kho, nhận dạng hàng hóa, tránh các tình huống mất an toàn và báo cáo trạng thái thời gian thực về bảng điều khiển WMS.
              Giao diện được thiết kế để vận hành và trình diễn: đơn giản, dễ đọc và gần gũi với hệ thống giám sát robot thực tế.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <img src="/autonomous_robot_icon.png" alt="Robot tự hành nhận diện hàng hóa" className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm" />
            <img src="/vr_control_icon.png" alt="VR điều khiển robot" className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Vấn đề Nghiên cứu" icon={<Target className="h-4 w-4 text-blue-600" />}>
          <p className="text-sm leading-relaxed text-[#64748B]">
            Di chuyển hàng hóa thủ công rất khó theo dõi và có thể gây mất an toàn khi robot, con người và hàng hóa cùng chung một không gian.
            Hệ thống cần một giao diện WMS rõ r · ng, dữ liệu robot đo lường từ xa tin cậy và các cảnh báo an toàn.
          </p>
        </SectionCard>
        <SectionCard title="Mục Tiêu Dự Án" icon={<Workflow className="h-4 w-4 text-blue-600" />}>
          <ul className="space-y-2 text-sm text-[#64748B]">
            <li>Xây dựng bảng điều khiển giám sát robot.</li>
            <li>Lập kế hoạch lộ trình với thuật toán Dijkstra trên bản đồ topo.</li>
            <li>Nhận diện hàng hóa, con người và vật cản bằng AI Vision.</li>
            <li>Báo động khi gặp vật cản, mất đường lai, pin yếu và lỗi giao tiếp.</li>
          </ul>
        </SectionCard>
        <SectionCard title="Tập Trung An To · n" icon={<ShieldAlert className="h-4 w-4 text-red-600" />}>
          <ul className="space-y-2 text-sm text-[#64748B]">
            <li>Vật cản dưới 50cm: cảnh báo.</li>
            <li>Vật cản dưới 30cm: rủi ro cao.</li>
            <li>Phát hiện con người: cảnh báo cấp cứu.</li>
            <li>Mất đường lai/định vị: dừng và khắc phục.</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Kiến Trúc Hệ Thống" description="Luồng dữ liệu đơn giản từ phần cứng đến WMS và AI Vision." icon={<Network className="h-4 w-4 text-blue-600" />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <IconTile icon={Bot} title="Robot AGV" description="Động cơ, dò lai, siêu âm, cánh tay servo" />
          <IconTile icon={Cpu} title="ESP32-S3 / UNO R3" description="Đo lường từ xa, thực thi lệnh, khung hình camera" />
          <IconTile icon={BrainCircuit} title="Server AI Vision" description="Nhận diện bằng YOLO/OpenCV, trả kết quả qua WebSocket" />
          <IconTile icon={Map} title="Website WMS" description="Bảng điều khiển, bản đồ, nhiệm vụ, cảnh báo và nhật ký" />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Vai Trò Phần Cứng" icon={<Cpu className="h-4 w-4 text-blue-600" />}>
          <div className="space-y-3">
            {hardware.map(([name, desc]) => <Item key={name} name={name} desc={desc} />)}
          </div>
        </SectionCard>

        <SectionCard title="Vai Trò Phần Mềm" icon={<GitBranch className="h-4 w-4 text-blue-600" />}>
          <div className="space-y-3">
            {software.map(([name, desc]) => <Item key={name} name={name} desc={desc} />)}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Điều Hướng & Phục Hồi" description="Bản đồ Topo + Dijkstra + xử lý dò lai." icon={<Route className="h-4 w-4 text-blue-600" />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Info title="Bản Đồ Topo" text="Nh ·  kho được biểu diễn th · nh các đỉnh và cạnh có trọng số, giúp dễ d · ng giải thích và gỡ lỗi lộ trình." />
          <Info title="Thuật toán Dijkstra" text="Công cụ lập lộ trình tìm đường đi ngắn nhất có sẵn và có thể tránh các cạnh bị khóa do có vật cản hoặc mất đường lai." />
          <Info title="Khôi Phục Đường Lai" text="Vạch yếu kích hoạt cảnh báo; mất đường lai hoặc lỗi định vị sẽ tạm dừng nhiệm vụ và yêu cầu khôi phục." />
        </div>
      </SectionCard>

      <SectionCard title="Dòng Thời Gian Vận H · nh" description="Tiến trình nhiệm vụ điển hình từ WMS đến khi robot ho · n th · nh.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {timeline.map((step, index) => (
            <div key={step} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">{index + 1}</div>
              <p className="text-xs font-bold leading-relaxed text-[#0F172A]">{step}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function Item({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-4">
      <p className="text-sm font-bold text-[#0F172A]">{name}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{desc}</p>
    </div>
  );
}

function Info({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-4">
      <p className="text-sm font-bold text-[#0F172A]">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-[#64748B]">{text}</p>
    </div>
  );
}
