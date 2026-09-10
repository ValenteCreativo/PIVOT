import PivotApp from '@/components/PivotApp';
import { detectMode } from '@/providers/mode';
export default function Home(){ return <PivotApp initialMode={detectMode()}/>; }
