import { supabase } from './supabase';
import type { Profile } from '../utils/auth';

// ============ Utilities ============

export function handleSupabaseError(error: unknown): string {
  if (!error) return 'حدث خطأ غير متوقع';
  const msg = (error as any)?.message || String(error);
  if (msg.includes('row-level security') || msg.includes('violates row-level')) {
    return 'لا توجد صلاحية، يرجى تسجيل الدخول أو التحقق من حسابك';
  }
  if (msg.includes('JWT') || msg.includes('token') || msg.includes('session')) {
    return 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول من جديد';
  }
  if (msg.includes('duplicate key') || msg.includes('unique')) {
    return 'هذا العنصر موجود مسبقاً';
  }
  if (msg.includes('foreign key') || msg.includes('violates foreign')) {
    return 'بيانات غير صحيحة، تأكد من صحة البيانات المدخلة';
  }
  if (msg.includes('null value') || msg.includes('not-null')) {
    return 'يرجى تعبئة جميع الحقول المطلوبة';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
    return 'تعذر الاتصال بالخادم، تحقق من اتصال الإنترنت';
  }
  if (msg.includes('bucket') || msg.includes('storage')) {
    return 'تعذر رفع الصورة، تحقق من نوع الملف وحجمه';
  }
  return 'حدث خطأ، حاول مرة أخرى';
}

export async function uploadOptionalImage(
  bucketName: string,
  file: File,
  pathPrefix: string,
): Promise<string | null> {
  try {
    if (!file.type.startsWith('image/')) {
      console.error('[uploadOptionalImage] not an image:', file.type);
      return null;
    }
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${pathPrefix}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucketName).upload(path, file, { upsert: true });
    if (error) {
      console.error(`[uploadOptionalImage] upload to ${bucketName} failed:`, error);
      return null;
    }
    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error('[uploadOptionalImage] unexpected error:', err);
    return null;
  }
}

// ============ Services ============
export async function fetchServices() {
  const { data, error } = await supabase.from('services').select('*').order('name');
  if (error) return [];
  return data || [];
}

// ============ Products ============
export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function fetchProductBids(productId: string) {
  const { data, error } = await supabase
    .from('product_bids')
    .select('*')
    .eq('product_id', productId)
    .order('bid_amount', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function fetchProductImages(productId: string): Promise<{ id: string; image_url: string; sort_order: number }[]> {
  const { data, error } = await supabase
    .from('product_images')
    .select('id, image_url, sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('Product fetch failed: product_images', error);
    return [];
  }
  return data || [];
}

export async function insertProductImages(productId: string, imageUrls: string[]): Promise<void> {
  if (!imageUrls.length) return;
  const rows = imageUrls.map((url, i) => ({ product_id: productId, image_url: url, sort_order: i }));
  const { error } = await supabase.from('product_images').insert(rows);
  if (error) {
    console.error('Product image upload failed: insert product_images', error);
    throw new Error(error.message);
  }
}

export async function deleteProductImages(productId: string): Promise<void> {
  const { error } = await supabase.from('product_images').delete().eq('product_id', productId);
  if (error) console.error('Product delete failed: product_images', error);
}

export async function endAuction(productId: string, closedBySeller = false): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ auction_status: closedBySeller ? 'closed_by_seller' : 'ended' })
    .eq('id', productId);
  if (error) throw new Error(error.message);
}

export async function insertProduct(profile: Profile, product: {
  title: string;
  category: string;
  price: string;
  unit: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  isAuction?: boolean;
  currentBid?: number;
  imageUrl?: string;
  auctionEndTime?: string;
  bidIncrement?: number;
}) {
  const { data, error } = await supabase.from('products').insert({
    user_id: profile.id,
    owner_name: profile.fullName,
    owner_phone: profile.phone,
    owner_whatsapp_enabled: profile.whatsappEnabled,
    title: product.title,
    category: product.category,
    price: product.price,
    unit: product.unit,
    description: product.description,
    location: product.location,
    latitude: product.latitude || null,
    longitude: product.longitude || null,
    is_auction: product.isAuction || false,
    current_bid: product.currentBid || null,
    image_url: product.imageUrl || null,
    auction_end_time: product.auctionEndTime || null,
    bid_increment: product.bidIncrement || 10,
    auction_status: 'active',
  }).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProduct(id: string, updates: {
  title?: string;
  category?: string;
  price?: string;
  unit?: string;
  description?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
  status?: string;
  auctionEndTime?: string | null;
  bidIncrement?: number;
}) {
  const dbUpdates: any = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.price !== undefined) dbUpdates.price = updates.price;
  if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
  if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
  if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.auctionEndTime !== undefined) dbUpdates.auction_end_time = updates.auctionEndTime;
  if (updates.bidIncrement !== undefined) dbUpdates.bid_increment = updates.bidIncrement;

  const { data, error } = await supabase
    .from('products')
    .update(dbUpdates)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function uploadProductImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchMyBids(userId: string) {
  const { data, error } = await supabase
    .from('product_bids')
    .select('*, products(title, category, owner_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function placeBid(productId: string, profile: Profile, amount: number) {
  const { error: bidError } = await supabase.from('product_bids').insert({
    product_id: productId,
    user_id: profile.id,
    bidder_name: profile.fullName,
    bid_amount: amount,
  });
  if (bidError) throw new Error(bidError.message);

  const { error: updateError } = await supabase
    .from('products')
    .update({ current_bid: amount })
    .eq('id', productId);
  if (updateError) throw new Error(updateError.message);
}

export async function fetchMyProducts(userId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// ============ Community Reports ============
export async function fetchReports() {
  const { data, error } = await supabase
    .from('community_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function insertReport(profile: Profile | null, report: {
  reportType: string;
  description: string;
  location: string;
  urgency: string;
  elderlyRelated: boolean;
  phone: string;
  hasWhatsApp: boolean;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}) {
  const insertData: any = {
    owner_name: profile?.fullName || 'زائر',
    owner_phone: report.phone,
    owner_whatsapp_enabled: report.hasWhatsApp,
    report_type: report.reportType,
    description: report.description,
    location: report.location,
    urgency: report.urgency,
    elderly_related: report.elderlyRelated,
    image_url: report.imageUrl || null,
    latitude: report.latitude || null,
    longitude: report.longitude || null,
  };
  if (profile) {
    insertData.user_id = profile.id;
  }
  const { data, error } = await supabase.from('community_reports').insert(insertData).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function uploadReportImage(userId: string | null, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const prefix = userId || 'guest';
  const path = `${prefix}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('report-images')
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('report-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteReport(id: string) {
  const { error } = await supabase.from('community_reports').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateReportStatus(reportId: string, status: string) {
  const { error } = await supabase
    .from('community_reports')
    .update({ status })
    .eq('id', reportId);
  if (error) throw new Error(error.message);
}

export async function fetchMyReports(userId: string) {
  const { data, error } = await supabase
    .from('community_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// ============ Announcements ============
export async function fetchAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function insertAnnouncement(profile: Profile, announcement: {
  title: string;
  category: string;
  eventDate?: string;
  eventTime?: string;
  period?: string;
  description: string;
  imageUrl?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}) {
  const { data, error } = await supabase.from('announcements').insert({
    user_id: profile.id,
    owner_name: profile.fullName,
    owner_phone: profile.phone,
    owner_whatsapp_enabled: profile.whatsappEnabled,
    title: announcement.title,
    category: announcement.category,
    event_date: announcement.eventDate || null,
    event_time: announcement.eventTime || null,
    period: announcement.period || null,
    description: announcement.description,
    image_url: announcement.imageUrl || null,
    location: announcement.location || null,
    latitude: announcement.latitude || null,
    longitude: announcement.longitude || null,
  }).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchMyAnnouncements(userId: string) {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function updateAnnouncement(id: string, updates: {
  title?: string;
  category?: string;
  eventDate?: string | null;
  eventTime?: string | null;
  description?: string;
  ownerPhone?: string;
  ownerWhatsappEnabled?: boolean;
  imageUrl?: string | null;
}) {
  const dbUpdates: any = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.eventDate !== undefined) dbUpdates.event_date = updates.eventDate || null;
  if (updates.eventTime !== undefined) dbUpdates.event_time = updates.eventTime || null;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.ownerPhone !== undefined) dbUpdates.owner_phone = updates.ownerPhone;
  if (updates.ownerWhatsappEnabled !== undefined) dbUpdates.owner_whatsapp_enabled = updates.ownerWhatsappEnabled;
  if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;

  const { data, error } = await supabase
    .from('announcements')
    .update(dbUpdates)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function uploadAnnouncementImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('announcement-images')
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('announcement-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchHealthRequests() {
  const { data, error } = await supabase
    .from('health_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function insertHealthRequest(profile: Profile, request: {
  age?: number;
  symptoms: string;
  urgency: string;
  location: string;
}) {
  const { data, error } = await supabase.from('health_requests').insert({
    user_id: profile.id,
    owner_name: profile.fullName,
    owner_phone: profile.phone,
    owner_whatsapp_enabled: profile.whatsappEnabled,
    age: request.age || null,
    symptoms: request.symptoms,
    urgency: request.urgency,
    location: request.location,
  }).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchMyHealthRequests(userId: string) {
  const { data, error } = await supabase
    .from('health_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// ============ Agriculture Requests ============
export async function fetchAgriRequests() {
  const { data, error } = await supabase
    .from('agriculture_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function insertAgriRequest(profile: Profile, request: {
  cropType: string;
  problemDescription: string;
  imageUrl?: string;
  aiDiagnosis?: string;
}) {
  const { data, error } = await supabase.from('agriculture_requests').insert({
    user_id: profile.id,
    owner_name: profile.fullName,
    owner_phone: profile.phone,
    owner_whatsapp_enabled: profile.whatsappEnabled,
    crop_type: request.cropType,
    problem_description: request.problemDescription,
    image_url: request.imageUrl || null,
    ai_diagnosis: request.aiDiagnosis || null,
  }).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchMyAgriRequests(userId: string) {
  const { data, error } = await supabase
    .from('agriculture_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// ============ Rides ============
export async function fetchRides() {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function fetchMyRides(userId: string) {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// ============ Ride Requests ============
export async function fetchRideRequests() {
  const { data, error } = await supabase
    .from('ride_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function insertRideRequest(profile: Profile, request: {
  fromLocation: string;
  toLocation: string;
  requestedTime: string;
  passengers: number;
  notes?: string;
}) {
  const { data, error } = await supabase.from('ride_requests').insert({
    user_id: profile.id,
    requester_name: profile.fullName,
    requester_phone: profile.phone,
    whatsapp_enabled: profile.whatsappEnabled,
    from_location: request.fromLocation,
    to_location: request.toLocation,
    requested_time: request.requestedTime,
    passengers: request.passengers,
    notes: request.notes || null,
  }).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchMyRideRequests(userId: string) {
  const { data, error } = await supabase
    .from('ride_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// ============ Events ============
export async function fetchEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .order('event_date', { ascending: true, nullsFirst: false });
  if (error) return [];
  return data || [];
}

export async function insertEvent(profile: Profile, event: {
  title: string;
  category: string;
  eventDate?: string;
  eventTime?: string;
  period?: string;
  location?: string;
  description: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  registrationEnabled?: boolean;
  expectedAttendees?: number;
}) {
  const { data, error } = await supabase.from('events').insert({
    user_id: profile.id,
    owner_name: profile.fullName,
    owner_phone: profile.phone,
    owner_whatsapp_enabled: profile.whatsappEnabled,
    title: event.title,
    category: event.category,
    event_date: event.eventDate || null,
    event_time: event.eventTime || null,
    period: event.period || null,
    location: event.location || null,
    description: event.description,
    image_url: event.imageUrl || null,
    latitude: event.latitude || null,
    longitude: event.longitude || null,
    registration_enabled: event.registrationEnabled || false,
    expected_attendees: event.expectedAttendees || null,
  }).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateEvent(id: string, updates: {
  title?: string;
  category?: string;
  eventDate?: string | null;
  eventTime?: string | null;
  location?: string;
  description?: string;
  imageUrl?: string | null;
}) {
  const dbUpdates: any = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.eventDate !== undefined) dbUpdates.event_date = updates.eventDate || null;
  if (updates.eventTime !== undefined) dbUpdates.event_time = updates.eventTime || null;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;

  const { data, error } = await supabase
    .from('events')
    .update(dbUpdates)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchMyEvents(userId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function uploadEventImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('event-images')
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('event-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadAgriImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('agriculture-images')
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('agriculture-images').getPublicUrl(path);
  return data.publicUrl;
}

// ============ Emergency ============
export async function insertEmergencyRequest(profile: Profile | null, location: {
  latitude: number;
  longitude: number;
}, emergencyType: string) {
  const insertData: any = {
    owner_name: profile?.fullName || 'زائر',
    owner_phone: profile?.phone || null,
    latitude: location.latitude,
    longitude: location.longitude,
    emergency_type: emergencyType,
  };
  if (profile) {
    insertData.user_id = profile.id;
  }
  const { data, error } = await supabase.from('emergency_requests').insert(insertData).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// ============ Profile Photo ============
export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from('profile-images')
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function updateAvatarUrl(userId: string, avatarUrl: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

// ============ Event Registrations ============
function generateRegistrationCode(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `EVT-${year}-${num}`;
}

export async function insertEventRegistration(eventId: string, userId: string | null, registration: {
  fullName: string;
  phone: string;
  email?: string;
  attendeesCount: number;
  whatsappAvailable: boolean;
  notes?: string;
}): Promise<{ id: string; registration_code: string }> {
  const code = generateRegistrationCode();
  const insertData: any = {
    event_id: eventId,
    full_name: registration.fullName,
    phone: registration.phone,
    email: registration.email || null,
    attendees_count: registration.attendeesCount,
    whatsapp_available: registration.whatsappAvailable,
    notes: registration.notes || null,
    registration_code: code,
  };
  if (userId) insertData.user_id = userId;
  const { data, error } = await supabase.from('event_registrations').insert(insertData).select('id, registration_code').maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id: string; registration_code: string };
}

export async function fetchMyRegistrations(userId: string) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('*, events(title, event_date, event_time, location, category, image_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Event registration failed: fetch my registrations', error);
    return [];
  }
  return data || [];
}

export async function fetchEventRegistrations(eventId: string) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('id, full_name, phone, attendees_count, registration_code, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function getEventRegistrationCount(eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from('event_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);
  if (error) return 0;
  return count || 0;
}
