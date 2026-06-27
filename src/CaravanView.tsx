import { useMemo } from 'react';
import {
  Truck, TrendingUp, MapPin, AlertCircle, Lightbulb, Wrench,
  Stethoscope, Sprout, Building2, Users, Gauge, Navigation,
} from 'lucide-react';
import { useTranslation } from './i18n/LanguageContext';

interface Props {
  reports: any[];
  onNavigate: (s: string) => void;
}

interface Recommendation {
  icon: typeof Truck;
  color: string;
  title: string;
  reason: string;
  action: string;
}

export default function CaravanView({ reports, onNavigate }: Props) {
  const { t } = useTranslation();
  const stats = useMemo(() => {
    const weekReports = reports.length;
    const typeCount: Record<string, number> = {};
    const locationCount: Record<string, number> = {};
    let elderlyCount = 0;
    let highUrgency = 0;

    reports.forEach((r) => {
      const type = r.report_type || r.type || '—';
      const location = r.location || '—';
      typeCount[type] = (typeCount[type] || 0) + 1;
      locationCount[location] = (locationCount[location] || 0) + 1;
      if (r.elderly_related || r.elderly) elderlyCount++;
      const urgency = r.urgency || '';
      if (urgency === 'عالي' || urgency === 'high') highUrgency++;
    });

    const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    const topLocation = Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    const needScore = Math.min(100, Math.round(
      weekReports * 8 + highUrgency * 10 + elderlyCount * 6
    ));

    return { weekReports, topType, topLocation, elderlyCount, highUrgency, needScore, typeCount, locationCount };
  }, [reports]);

  const recommendations = useMemo<Recommendation[]>(() => {
    const recs: Recommendation[] = [];

    if (stats.topType === 'إنارة' && (stats.typeCount['إنارة'] || 0) >= 2) {
      recs.push({
        icon: Wrench,
        color: 'amber',
        title: 'زيارة صيانة بلدية لإنارة الشارع',
        reason: `تكرار بلاغات الإنارة (${stats.typeCount['إنارة']} بلاغات) في ${stats.topLocation}`,
        action: 'إرسال فريق صيانة',
      });
    }

    if ((stats.typeCount['صحة'] || 0) >= 1 || stats.elderlyCount >= 2) {
      recs.push({
        icon: Stethoscope,
        color: 'rose',
        title: 'تنظيم عيادة متنقلة',
        reason: `${stats.elderlyCount} بلاغ يخص كبار السن، وارتفاع الاستشارات الصحية`,
        action: 'جدولة عيادة متنقلة',
      });
    }

    if ((stats.typeCount['زراعة'] || 0) >= 1) {
      recs.push({
        icon: Sprout,
        color: 'emerald',
        title: 'جلسة دعم زراعي ميداني',
        reason: 'وجود بلاغات تتعلق بمشاكل في النخيل والمحاصيل',
        action: 'تنظيم جلسة زراعية',
      });
    }

    recs.push({
      icon: Building2,
      color: 'blue',
      title: 'إرسال كشك خدمات حكومية',
      reason: `خدمة أهالي ${stats.topLocation} الأكثر احتياجاً (${stats.weekReports} بلاغات)`,
      action: 'جدولة الكشك يوم السبت',
    });

    if ((stats.typeCount['نظافة'] || 0) >= 1) {
      recs.push({
        icon: Users,
        color: 'cyan',
        title: 'حملة نظافة مجتمعية',
        reason: 'بلاغات نظافة في مناطق متفرقة',
        action: 'تنظيم حملة تطوعية',
      });
    }

    return recs;
  }, [stats]);

  const needLevel = stats.needScore >= 70 ? 'عالي' : stats.needScore >= 40 ? 'متوسط' : 'منخفض';

  const statCards = [
    { label: 'بلاغات هذا الأسبوع', value: String(stats.weekReports), icon: AlertCircle, color: 'orange', bg: 'bg-orange-50', text: 'text-orange-700' },
    { label: 'أكثر خدمة مطلوبة', value: stats.topType, icon: TrendingUp, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-700' },
    { label: 'أعلى منطقة احتياجاً', value: stats.topLocation, icon: MapPin, color: 'rose', bg: 'bg-rose-50', text: 'text-rose-700' },
    { label: 'مؤشر احتياج المجتمع', value: `${stats.needScore}/100`, icon: Gauge, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-l from-[#1a5c38] to-[#2d7a4f] text-white rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-2xl bg-[#c8b97a] flex items-center justify-center">
            <Truck size={28} className="text-[#1a5c38]" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">القافلة الذكية</h2>
            <p className="text-white/80 text-sm sm:text-base">نحوّل احتياجات المجتمع إلى خدمات متنقلة تصل إلى الناس</p>
          </div>
        </div>
        <div className="mt-4 bg-white/10 rounded-2xl p-4 flex items-center gap-3">
          <Gauge size={24} className="text-[#c8b97a]" />
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span>Rural Need Score</span>
              <span className="font-bold">{stats.needScore}/100 - {needLevel}</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  stats.needScore >= 70 ? 'bg-red-400' : stats.needScore >= 40 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${stats.needScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={`${s.bg} border border-stone-200/60 rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={18} className={s.text} />
              <span className="text-xs text-stone-600">{s.label}</span>
            </div>
            <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-5">
        <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
          <MapPin size={20} className="text-[#1a5c38]" />
          خريطة مناطق الاحتياج
        </h3>
        <div className="relative h-56 bg-gradient-to-br from-[#e8dcc0] to-[#d4c4a0] rounded-2xl overflow-hidden border border-[#c8b97a]/40">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 right-8 w-20 h-20 rounded-full bg-[#c8b97a]/40" />
            <div className="absolute bottom-8 left-12 w-32 h-16 rounded-full bg-[#c8b97a]/30" />
            <div className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full bg-[#c8b97a]/35" />
          </div>
          <Sprout size={20} className="absolute top-6 right-1/4 text-[#1a5c38]/50" />
          <Sprout size={16} className="absolute bottom-10 right-1/2 text-[#1a5c38]/50" />
          <Sprout size={18} className="absolute top-1/3 left-1/4 text-[#1a5c38]/50" />

          {Object.entries(stats.locationCount).map(([loc, count], i) => {
            const positions = [
              { top: '20%', right: '15%' },
              { top: '55%', right: '45%' },
              { top: '35%', right: '70%' },
              { top: '70%', right: '20%' },
              { top: '25%', right: '55%' },
            ];
            const pos = positions[i % positions.length];
            const intensity = count >= 3 ? 'bg-red-500' : count >= 2 ? 'bg-amber-500' : 'bg-emerald-500';
            return (
              <div key={loc} className="absolute -translate-x-1/2 -translate-y-1/2" style={pos}>
                <div className={`relative ${intensity} rounded-full p-2 shadow-lg`}>
                  <MapPin size={16} className="text-white" />
                  <span className="absolute -top-1 -right-1 bg-white text-stone-800 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border border-stone-200">
                    {count}
                  </span>
                </div>
                <p className="absolute top-full mt-1 right-0 text-xs font-semibold text-stone-700 bg-white/80 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {loc}
                </p>
              </div>
            );
          })}
          <div className="absolute bottom-2 left-2 bg-white/80 rounded-lg px-2 py-1 text-xs flex items-center gap-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> عالي</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> متوسط</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> منخفض</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-xl text-stone-800 mb-4 flex items-center gap-2">
          <Lightbulb size={22} className="text-amber-500" />
          توصيات ذكية للقافلة
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {recommendations.map((rec, i) => {
            const colorMap: Record<string, string> = {
              amber: 'bg-amber-50 border-amber-200 text-amber-700',
              rose: 'bg-rose-50 border-rose-200 text-rose-700',
              emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
              blue: 'bg-blue-50 border-blue-200 text-blue-700',
              cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
            };
            return (
              <div key={i} className={`border rounded-2xl p-4 ${colorMap[rec.color]}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                    <rec.icon size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-stone-800">{rec.title}</h4>
                    <p className="text-sm text-stone-600 mt-1">{rec.reason}</p>
                    <button
                      onClick={() => alert(`Demo: ${rec.action}\n\nفي النسخة الكاملة، سيتم جدولة هذا الإجراء وإرسال إشعار للجهة المعنية.`)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-white text-stone-700 border border-stone-300 px-3 py-1.5 rounded-full hover:bg-stone-50 transition"
                    >
                      <Navigation size={13} /> {rec.action}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#1a5c38] text-white rounded-2xl p-5 text-center">
        <p className="text-sm text-white/90 mb-3">ساهم في تحسين خدمات القافلة الذكية برفع بلاغاتك واحتياجاتك</p>
        <button
          onClick={() => onNavigate('reports')}
          className="bg-[#c8b97a] text-[#1a5c38] font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-[#d4c789] transition inline-flex items-center gap-2"
        >
          <AlertCircle size={16} /> ارفع بلاغاً
        </button>
      </div>
    </div>
  );
}
