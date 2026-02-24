import PatientClient from './PatientClient';

export async function generateStaticParams() {
  // Return some dummy IDs for the static export to succeed.
  // In a real SPA with output: export, these are just shells; 
  // the actual data is fetched on the client side using the ID from the URL.
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' }
  ];
}

export default async function PatientPage({ params }) {
  const { id } = await params;

  return <PatientClient id={id} />;
}
