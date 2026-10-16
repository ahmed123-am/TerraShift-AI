import { useEffect, useMemo, useState } from "react";

import { getFarms, updateFarm, deleteFarm } from "../services/farms";

import type { Farm, SoilType, CreateFarmData } from "../services/farms";

import FarmMap from "../components/common/FarmMap";
import "../styles/FarmExplorer.css";

type FarmExplorerProps = {

  language?: "ar" | "en";

  onBack?: () => void;

  onFarmsChange?: (farms: Farm[]) => void;

};

export default function FarmExplorer({

  language = "en",

  onBack,

  onFarmsChange,

}: FarmExplorerProps) {

  const isArabic = language === "ar";

  const [farms, setFarms] = useState<Farm[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const copy = {

    eyebrow: isArabic ? "إدارة الأراضي الزراعية" : "FARM MANAGEMENT",

    title: isArabic ? "استكشاف المزارع" : "Farm Explorer",

    subtitle: isArabic

      ? "تابع مزارعك وبياناتها الجغرافية من مكان واحد."

      : "Explore, organize, and manage your farms in one place.",

    back: isArabic ? "العودة للرئيسية" : "Back to dashboard",

    refresh: isArabic ? "تحديث البيانات" : "Refresh data",

    loading: isArabic ? "جاري التحميل..." : "Loading...",

    total: isArabic ? "إجمالي المزارع" : "Total farms",

    area: isArabic ? "إجمالي المساحة" : "Total area",

    mapped: isArabic ? "مزارع محددة جغرافيًا" : "Geolocated farms",

    searchLabel: isArabic ? "ابحث في مزارعك" : "Search your farms",

    searchPlaceholder: isArabic ? "اسم المزرعة أو الموقع أو المحصول..." : "Farm name, location, or crop...",

    results: isArabic ? "مزرعة في النتائج" : "farms found",

    noResults: isArabic ? "لم نعثر على مزارع" : "No farms found",

    noResultsText: isArabic ? "جرّب تغيير كلمات البحث أو امسح البحث لعرض كل المزارع." : "Try another search term or clear the search to see all farms.",

    empty: isArabic ? "لسه مفيش مزارع عندك" : "Your farm space is empty",

    emptyText: isArabic ? "أضف مزرعتك الأولى لبدء متابعة المساحة والمحصول والإحداثيات." : "Add your first farm to start tracking its area, crop, and coordinates.",

    clear: isArabic ? "مسح البحث" : "Clear search",

    edit: isArabic ? "تعديل البيانات" : "Edit farm",

    delete: isArabic ? "حذف المزرعة" : "Delete farm",

    location: isArabic ? "الموقع" : "Location",

    farmArea: isArabic ? "المساحة" : "Area",

    soil: isArabic ? "نوع التربة" : "Soil type",

    crop: isArabic ? "المحصول الحالي" : "Current crop",

    coordinates: isArabic ? "الإحداثيات الجغرافية" : "Geographic coordinates",

    mappedStatus: isArabic ? "محددة جغرافيًا" : "Geolocated",

    missingStatus: isArabic ? "بدون إحداثيات" : "Not geolocated",

    hectares: isArabic ? "هكتار" : "ha",

    notSpecified: isArabic ? "غير محدد" : "Not specified",

    editTitle: isArabic ? "تعديل بيانات المزرعة" : "Edit farm details",

    editSubtitle: isArabic ? "حدّث البيانات ثم احفظ التغييرات." : "Update the farm details and save your changes.",

    name: isArabic ? "اسم المزرعة" : "Farm name",

    latitude: isArabic ? "خط العرض" : "Latitude",

    longitude: isArabic ? "خط الطول" : "Longitude",

    coordinateHint: isArabic ? "أدخل الإحداثيين معًا، أو اتركهما فارغين إذا لم تعرفهما." : "Enter both coordinates, or leave both empty if unknown.",

    save: isArabic ? "حفظ التعديلات" : "Save changes",

    cancel: isArabic ? "إلغاء" : "Cancel",

    saving: isArabic ? "جاري الحفظ..." : "Saving...",

    deleting: isArabic ? "جاري الحذف..." : "Deleting...",

    confirmDelete: (name: string) => isArabic ? `هل تريد حذف المزرعة «${name}»؟ لا يمكن التراجع عن هذا الإجراء.` : `Delete “${name}”? This action cannot be undone.`,

  };

  const soilLabels: Record<SoilType, string> = {

    clay: isArabic ? "طينية" : "Clay",

    sandy: isArabic ? "رملية" : "Sandy",

    loamy: isArabic ? "طميية" : "Loamy",

    silty: isArabic ? "غرينية" : "Silty",

    other: isArabic ? "أخرى" : "Other",

  };

  async function loadFarms() {

    try {

      setLoading(true);

      setError("");

      const data = await getFarms();

      setFarms(data);

      onFarmsChange?.(data);

    } catch (err) {

      console.error("Failed to load farms:", err);

      setError(err instanceof Error ? err.message : isArabic ? "تعذر تحميل المزارع." : "Could not load farms.");

    } finally {

      setLoading(false);

    }

  }

  useEffect(() => {

    void loadFarms();

    // Load once when the explorer is mounted.

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);

  const filteredFarms = useMemo(() => {

    const query = search.trim().toLocaleLowerCase(isArabic ? "ar" : "en");

    if (!query) return farms;

    return farms.filter((farm) =>

      [farm.name, farm.location, farm.current_crop ?? ""].some((value) =>

        value.toLocaleLowerCase(isArabic ? "ar" : "en").includes(query),

      ),

    );

  }, [farms, search, isArabic]);

  const totalArea = farms.reduce((sum, farm) => sum + (Number(farm.area_hectares) || 0), 0);

  const mappedCount = farms.filter((farm) => farm.latitude !== null && farm.longitude !== null).length;

  async function handleDelete(farm: Farm) {

    if (!window.confirm(copy.confirmDelete(farm.name))) return;

    try {

      setDeletingId(farm.id);

      setError("");

      await deleteFarm(farm.id);

      const updatedFarms = farms.filter((item) => item.id !== farm.id);

      setFarms(updatedFarms);

      onFarmsChange?.(updatedFarms);

    } catch (err) {

      setError(err instanceof Error ? err.message : isArabic ? "فشل حذف المزرعة." : "Failed to delete farm.");

    } finally {

      setDeletingId(null);

    }

  }

  async function handleSave() {

    if (!editingFarm) return;

    const farm = editingFarm;

    if (!farm.name.trim() || !farm.location.trim()) {

      setError(isArabic ? "اسم المزرعة والموقع مطلوبان." : "Farm name and location are required.");

      return;

    }

    if (!Number.isFinite(farm.area_hectares) || farm.area_hectares <= 0) {

      setError(isArabic ? "المساحة يجب أن تكون أكبر من صفر." : "Area must be greater than zero.");

      return;

    }

    if ((farm.latitude === null) !== (farm.longitude === null)) {

      setError(isArabic ? "أدخل الإحداثيين معًا أو اتركهما فارغين." : "Enter both coordinates or leave both empty.");

      return;

    }

    if (farm.latitude !== null && (!Number.isFinite(farm.latitude) || farm.latitude < -90 || farm.latitude > 90)) {

      setError(isArabic ? "خط العرض يجب أن يكون بين -90 و90." : "Latitude must be between -90 and 90.");

      return;

    }

    if (farm.longitude !== null && (!Number.isFinite(farm.longitude) || farm.longitude < -180 || farm.longitude > 180)) {

      setError(isArabic ? "خط الطول يجب أن يكون بين -180 و180." : "Longitude must be between -180 and 180.");

      return;

    }

    const farmData: CreateFarmData = {

      name: farm.name.trim(),

      location: farm.location.trim(),

      area_hectares: farm.area_hectares,

      soil_type: farm.soil_type,

      current_crop: farm.current_crop.trim() || (isArabic ? "غير محدد" : "Not specified"),

      latitude: farm.latitude,

      longitude: farm.longitude,

    };

    try {

      setSaving(true);

      setError("");

      const updatedFarm = await updateFarm(farm.id, farmData);

      const updatedFarms = farms.map((item) => item.id === updatedFarm.id ? updatedFarm : item);

      setFarms(updatedFarms);

      onFarmsChange?.(updatedFarms);

      setEditingFarm(null);

    } catch (err) {

      console.error("Failed to update farm:", err);

      setError(err instanceof Error ? err.message : isArabic ? "فشل تحديث بيانات المزرعة." : "Failed to update farm.");

    } finally {

      setSaving(false);

    }

  }

  return (

    <section className="tx-farm-page" dir={isArabic ? "rtl" : "ltr"}>

      <div className="tx-farm-container">

        <header className="tx-farm-hero">

          <div className="tx-farm-heading">

            <span className="tx-farm-eyebrow"><span className="tx-farm-eyebrow-dot" />{copy.eyebrow}</span>

            <h1>{copy.title}</h1>

            <p>{copy.subtitle}</p>

          </div>

          <div className="tx-farm-header-actions">

            {onBack && <button type="button" className="tx-farm-button tx-farm-button-secondary" onClick={onBack}><span aria-hidden="true">←</span>{copy.back}</button>}

            <button type="button" className="tx-farm-button tx-farm-button-refresh" onClick={() => void loadFarms()} disabled={loading}><span aria-hidden="true" className={loading ? "tx-farm-refreshing" : ""}>↻</span>{loading ? copy.loading : copy.refresh}</button>

          </div>

        </header>

        <section className="tx-farm-metrics" aria-label={isArabic ? "ملخص المزارع" : "Farm summary"}>

          <article className="tx-farm-metric tx-farm-metric-green"><span className="tx-farm-metric-icon" aria-hidden="true">▦</span><div><p>{copy.total}</p><strong>{farms.length}</strong><small>{isArabic ? "كل المزارع المسجلة" : "All registered farms"}</small></div></article>

          <article className="tx-farm-metric tx-farm-metric-blue"><span className="tx-farm-metric-icon" aria-hidden="true">⌁</span><div><p>{copy.area}</p><strong>{totalArea.toLocaleString(isArabic ? "ar-EG" : "en-US", { maximumFractionDigits: 2 })} <small>{copy.hectares}</small></strong><small>{isArabic ? "المساحة المسجلة بالكامل" : "Combined registered area"}</small></div></article>

          <article className="tx-farm-metric tx-farm-metric-amber"><span className="tx-farm-metric-icon" aria-hidden="true">◎</span><div><p>{copy.mapped}</p><strong>{mappedCount}<small> / {farms.length}</small></strong><small>{isArabic ? "مرتبطة بإحداثيات" : "With coordinates saved"}</small></div></article>

        </section>

        <section className="tx-farm-controls">

          <div className="tx-farm-search-wrap"><span className="tx-farm-search-icon" aria-hidden="true">⌕</span><label className="tx-farm-sr-only" htmlFor="tx-farm-search">{copy.searchLabel}</label><input id="tx-farm-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} /></div>

          <span className="tx-farm-result-count"><strong>{filteredFarms.length}</strong> {copy.results}</span>

        </section>

        <section className="tx-farm-map-section" aria-label={isArabic ? "خريطة المزارع" : "Farm map"}>
          <div className="tx-farm-map-heading">
            <div>
              <span className="tx-farm-eyebrow">{isArabic ? "عرض جغرافي" : "GEOGRAPHIC OVERVIEW"}</span>
              <h2>{isArabic ? "مزارعك على الخريطة" : "Your farms on the map"}</h2>
              <p>
                {isArabic
                  ? "اختَر علامة لعرض بيانات المزرعة. نتائج البحث تنعكس على الخريطة."
                  : "Select a marker to view farm details. Search results are reflected on the map."}
              </p>
            </div>
            <span className="tx-farm-map-count">
              {filteredFarms.filter((farm) => farm.latitude !== null && farm.longitude !== null).length}{" "}
              {isArabic ? "مزرعة محددة جغرافيًا" : "mapped farms"}
            </span>
          </div>
          <FarmMap farms={filteredFarms} language={language} height={380} />
        </section>

        {error && <div className="tx-farm-error" role="alert"><span aria-hidden="true">!</span><p>{error}</p><button type="button" onClick={() => setError("")} aria-label={isArabic ? "إغلاق التنبيه" : "Dismiss alert"}>×</button></div>}

        {loading ? (

          <div className="tx-farm-state"><span className="tx-farm-spinner" /><h2>{copy.loading}</h2><p>{isArabic ? "بنجهز بيانات المزارع..." : "Getting your farm data ready..."}</p></div>

        ) : filteredFarms.length === 0 ? (

          <div className="tx-farm-state tx-farm-empty"><div className="tx-farm-empty-art" aria-hidden="true"><span>🌱</span><i /><i /><i /></div><h2>{search.trim() ? copy.noResults : copy.empty}</h2><p>{search.trim() ? copy.noResultsText : copy.emptyText}</p>{search.trim() && <button type="button" className="tx-farm-button tx-farm-button-primary" onClick={() => setSearch("")}>{copy.clear}</button>}</div>

        ) : (

          <section className="tx-farm-grid" aria-label={copy.title}>

            {filteredFarms.map((farm, index) => {

              const isMapped = farm.latitude !== null && farm.longitude !== null;

              return <article className="tx-farm-card" key={farm.id} style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}>

                <div className="tx-farm-card-topline"><span className="tx-farm-card-symbol" aria-hidden="true">🌿</span><span className={`tx-farm-badge ${isMapped ? "is-mapped" : "is-unmapped"}`}><i />{isMapped ? copy.mappedStatus : copy.missingStatus}</span></div>

                <div className="tx-farm-card-title"><span>{isArabic ? `مزرعة رقم ${farm.id}` : `FARM ID · ${farm.id}`}</span><h2>{farm.name}</h2><p><span aria-hidden="true">⌖</span>{farm.location}</p></div>

                <div className="tx-farm-card-details">

                  <div className="tx-farm-detail"><span className="tx-farm-detail-icon" aria-hidden="true">▱</span><div><small>{copy.farmArea}</small><strong>{farm.area_hectares} {copy.hectares}</strong></div></div>

                  <div className="tx-farm-detail"><span className="tx-farm-detail-icon" aria-hidden="true">◈</span><div><small>{copy.soil}</small><strong>{soilLabels[farm.soil_type] ?? farm.soil_type}</strong></div></div>

                  <div className="tx-farm-detail tx-farm-detail-crop"><span className="tx-farm-detail-icon" aria-hidden="true">♧</span><div><small>{copy.crop}</small><strong>{farm.current_crop || copy.notSpecified}</strong></div></div>

                </div>

                <div className="tx-farm-coordinates"><div><span className="tx-farm-coordinate-icon" aria-hidden="true">◎</span><div><strong>{copy.coordinates}</strong><small>{isMapped ? `${farm.latitude}, ${farm.longitude}` : copy.missingStatus}</small></div></div>{isMapped && <a href={`https://www.google.com/maps?q=${farm.latitude},${farm.longitude}`} target="_blank" rel="noreferrer" aria-label={isArabic ? "عرض الموقع على الخريطة" : "View farm on map"}>↗</a>}</div>

                <footer className="tx-farm-card-actions"><button type="button" className="tx-farm-button tx-farm-button-edit" onClick={() => { setError(""); setEditingFarm({...farm, latitude: farm.latitude ?? null, longitude: farm.longitude ?? null }); }}><span aria-hidden="true">✎</span>{copy.edit}</button><button type="button" className="tx-farm-button tx-farm-button-delete" onClick={() => void handleDelete(farm)} disabled={deletingId === farm.id}><span aria-hidden="true">{deletingId === farm.id ? "…" : "⌫"}</span>{deletingId === farm.id ? copy.deleting : copy.delete}</button></footer>

              </article>;

            })}

          </section>

        )}

        <footer className="tx-farm-page-footer"><span><span className="tx-farm-footer-dot" />TerraShift AI</span><span>{isArabic ? "إدارة زراعية أذكى تبدأ من بيانات دقيقة." : "Smarter agriculture starts with better data."}</span></footer>

      </div>

      {editingFarm && <div className="tx-farm-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditingFarm(null); }}>

        <section className="tx-farm-modal" role="dialog" aria-modal="true" aria-labelledby="tx-farm-modal-title" dir={isArabic ? "rtl" : "ltr"}>

          <header className="tx-farm-modal-header"><div><span className="tx-farm-eyebrow">{isArabic ? "تحديث المعلومات" : "UPDATE INFORMATION"}</span><h2 id="tx-farm-modal-title">{copy.editTitle}</h2><p>{copy.editSubtitle}</p></div><button type="button" className="tx-farm-modal-close" onClick={() => !saving && setEditingFarm(null)} disabled={saving} aria-label={copy.cancel}>×</button></header>

          <form onSubmit={(event) => { event.preventDefault(); void handleSave(); }}>

            <div className="tx-farm-form-grid">

              <label>{copy.name}<input required minLength={2} maxLength={100} value={editingFarm.name} onChange={(event) => setEditingFarm({...editingFarm, name: event.target.value })} /></label>

              <label>{copy.location}<input required minLength={2} maxLength={200} value={editingFarm.location} onChange={(event) => setEditingFarm({...editingFarm, location: event.target.value })} /></label>

              <label>{isArabic ? "المساحة بالهكتار" : "Area (hectares)"}<input type="number" min="0.01" step="any" required value={editingFarm.area_hectares} onChange={(event) => setEditingFarm({...editingFarm, area_hectares: Number(event.target.value) })} /></label>

              <label>{copy.soil}<select value={editingFarm.soil_type} onChange={(event) => setEditingFarm({...editingFarm, soil_type: event.target.value as SoilType })}><option value="clay">{soilLabels.clay}</option><option value="sandy">{soilLabels.sandy}</option><option value="loamy">{soilLabels.loamy}</option><option value="silty">{soilLabels.silty}</option><option value="other">{soilLabels.other}</option></select></label>

              <label className="tx-farm-form-full">{copy.crop}<input maxLength={100} value={editingFarm.current_crop} onChange={(event) => setEditingFarm({...editingFarm, current_crop: event.target.value })} /></label>

            </div>

            <div className="tx-farm-coordinate-fields"><div className="tx-farm-coordinate-heading"><span aria-hidden="true">◎</span><div><strong>{copy.coordinates}</strong><p>{copy.coordinateHint}</p></div></div><div className="tx-farm-form-grid"><label>{copy.latitude}<input type="number" min="-90" max="90" step="any" value={editingFarm.latitude ?? ""} placeholder="31.4" onChange={(event) => setEditingFarm({...editingFarm, latitude: event.target.value.trim() === "" ? null : Number(event.target.value) })} /></label><label>{copy.longitude}<input type="number" min="-180" max="180" step="any" value={editingFarm.longitude ?? ""} placeholder="31.8" onChange={(event) => setEditingFarm({...editingFarm, longitude: event.target.value.trim() === "" ? null : Number(event.target.value) })} /></label></div></div>

            {error && <div className="tx-farm-error tx-farm-modal-error" role="alert"><span>!</span><p>{error}</p></div>}

            <div className="tx-farm-modal-actions"><button type="button" className="tx-farm-button tx-farm-button-secondary" onClick={() => setEditingFarm(null)} disabled={saving}>{copy.cancel}</button><button type="submit" className="tx-farm-button tx-farm-button-primary" disabled={saving}>{saving ? copy.saving : copy.save}</button></div>

          </form>

        </section>

      </div>}

    </section>

  );

}
