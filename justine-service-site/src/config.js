// =====================================================================
//  EDIT THIS FILE: everything shown on the Webbins website lives here.
//  Images go in  public/images/  (see the IMAGES list below).
// =====================================================================

export const BRAND = {
  name: 'Webbins',
  tagline: 'Website Developer Service',
  line: 'Beautiful, fast websites for restaurants and businesses, built from first sketch to launch.',
};

export const OWNER = {
  // MUST match the email in firestore.rules. Lowercase only.
  email: 'patacjustinekeo@gmail.com',
  name: 'Justine Keo Patac',
  firstName: 'Justine',
  roles: ['Restaurant websites', 'Business websites', 'Web apps with login and chat'],
  intro: 'I am the developer and designer behind Webbins. I build websites that look great and bring in customers.',
  bio: [
    "Hi, I'm Justine, a website developer and graphic designer. I help restaurants, cafes and local businesses get a website that looks great and works for them: menus people can read, bookings and orders that are easy to make, and a brand that feels like theirs.",
    'Because I do both design and code, you talk to one person from the first sketch to the day your website goes live.',
  ],
};

// Where your photos go. The website shows a labeled box until the file exists.
export const IMAGES = {
  profile: '/images/profile.jpg',      // Who I am page + chat avatar (square photo of you)
  background: '/images/background.jpg', // Background page (photo about your story)
  career: '/images/career.jpg',         // Career page (photo of you working)
  wiseQr: '/images/wise-qr.png',        // Payment page (your Wise QR code)
};

export const SERVICES = [
  { icon: '🍽️', title: 'Restaurant websites', text: 'Menu, gallery, location, reservations and online ordering.' },
  { icon: '🏪', title: 'Business websites', text: 'Clear service pages, contact forms and a look that builds trust.' },
  { icon: '⚙️', title: 'Web apps', text: 'Logins, dashboards and chat, like the one you are using now.' },
];

// category must be one of: 'Restaurant', 'Business', 'Web App'.  Images: public/images/work-1.jpg ...
export const WORKS = [
  { title: 'Sunset Grill', category: 'Restaurant', image: '/images/work-1.jpg', link: '#', tags: ['Menu', 'Online ordering'], text: 'A warm, photo-led site for a seaside grill with a live menu and table booking.' },
  { title: 'Kape Corner', category: 'Restaurant', image: '/images/work-2.jpg', link: '#', tags: ['Cafe', 'Gallery'], text: 'A cozy cafe site with a drinks menu, story page and opening hours.' },
  { title: 'Bright Dental', category: 'Business', image: '/images/work-3.jpg', link: '#', tags: ['Clinic', 'Booking'], text: 'A calm, trustworthy clinic site with services and appointment requests.' },
  { title: 'Island Realty', category: 'Business', image: '/images/work-4.jpg', link: '#', tags: ['Listings', 'Inquiry form'], text: 'Property listings with filters and a quick inquiry form for buyers.' },
  { title: 'Order Desk', category: 'Web App', image: '/images/work-5.jpg', link: '#', tags: ['Firebase', 'Dashboard'], text: 'An order dashboard where a shop owner sees and updates orders live.' },
  { title: 'Chat Support', category: 'Web App', image: '/images/work-6.jpg', link: '#', tags: ['Realtime', 'Auth'], text: 'Private customer chat with logins, built on Firebase.' },
];

export const SKILLS = [
  { name: 'HTML & CSS', level: 95 },
  { name: 'JavaScript', level: 85 },
  { name: 'Firebase', level: 80 },
  { name: 'UI design (Canva, Figma)', level: 90 },
  { name: 'Branding & graphics', level: 88 },
  { name: 'Photo & video editing', level: 82 },
];
export const TOOLS = ['HTML', 'CSS', 'JavaScript', 'Firebase', 'Vite', 'GitHub', 'Canva', 'CapCut', 'Responsive design', 'SEO basics'];

// Sample prices. Change the amounts and features to your real rates.
export const RATES = [
  { name: 'Starter', price: '$150', per: 'one-page website', features: ['Mobile-friendly design', 'Contact or inquiry form', 'Basic SEO setup', '1 round of changes'] },
  { name: 'Business', price: '$350', per: 'up to 5 pages', popular: true, features: ['Everything in Starter', 'Menu, services or gallery pages', 'Social media links and map', '3 rounds of changes'] },
  { name: 'Premium', price: '$700', per: 'full website + app features', features: ['Everything in Business', 'Customer login and dashboard', 'Online ordering or booking', 'Priority support'] },
];

// Your numbers that are NOT from customer ratings on this site
export const STATS = { projectsDone: 25, extraSatisfied: 0 };

export const BACKGROUND = [
  { year: '2019', title: 'Started with design', text: 'Began with posters, ads and social media graphics using Canva.' },
  { year: '2021', title: 'Learned to code', text: 'Taught myself HTML, CSS and JavaScript to turn designs into real websites.' },
  { year: '2023', title: 'First restaurant client', text: 'Built my first full restaurant website and learned what owners really need.' },
];
export const CAREER = [
  { year: '2023', title: 'Freelance web developer', place: 'Self-employed', text: 'Websites for cafes, restaurants and small shops.' },
  { year: '2024', title: 'Web apps with Firebase', place: 'Self-employed', text: 'Added logins, dashboards and live chat to client websites.' },
  { year: '2026', title: 'Founded Webbins', place: 'Webbins', text: 'A website developer service that handles design, code and launch.' },
];

// Wise payment details. Put your QR image at public/images/wise-qr.png
export const WISE = {
  accountName: 'Justine Keo Patac',
  handle: '@your-wise-tag',
  email: 'your_owner_email@gmail.com',
  note: 'Send the agreed amount, then press "I have paid" so I can confirm it.',
};

export const CONTACTS = [
  { icon: '✉️', label: 'Email', value: 'your_owner_email@gmail.com', href: 'mailto:your_owner_email@gmail.com' },
  { icon: '📘', label: 'Facebook', value: 'facebook.com/yourpage', href: 'https://facebook.com/yourpage' },
  { icon: '📸', label: 'Instagram', value: '@yourhandle', href: 'https://instagram.com/yourhandle' },
  { icon: '💻', label: 'GitHub', value: 'github.com/yourname', href: 'https://github.com/yourname' },
];
