
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, useParams } from 'react-router-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, differenceInCalendarDays } from 'date-fns';

import Layout from './components/Layout';
import ChaletDetails from './components/ChaletDetails';
import Admin from './components/Admin';
import Gallery from './components/Gallery';
import Location from './components/Location';
import ChatPage from './components/Chat';
import Login from './components/Login';
import Policies from './components/Policies';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WHATSAPP_NUMBER } from './constants';
import { ReservationService, ChaletService, SiteService, PricingService, Reservation, CustomPrice } from './services/storage';
import { Chalet } from './types';
import { formatCurrency, getAmenityIcon } from './utils/helpers';
import { 
  Calendar as CalendarIcon, Users, Search, Ban, CalendarCheck, RotateCcw,
  Sparkles, CreditCard
} from 'lucide-react';

registerLocale('pt-BR', ptBR);



const HeroSlider = () => {
  const [index, setIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);

  React.useEffect(() => {
    SiteService.getHeroImages().then(setImages);
  }, []);

  React.useEffect(() => {
    if (images.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images]);

  if (images.length === 0) return null;

  return (
    <div className="relative h-[85vh] min-h-[400px] md:min-h-[600px] w-full overflow-hidden bg-serra-dark">
      <AnimatePresence mode='wait'>
        <motion.img
          key={index}
          src={images[index]}
          alt="Hero Background"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.6, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <span className="inline-block py-1 px-4 mb-4 rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-white text-xs font-bold tracking-[0.3em] uppercase">
            Experiência Única
          </span>
          <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl text-white mb-6 leading-tight drop-shadow-lg">
            Sua conexão com a natureza <br/>
            <span className="italic font-light text-serra-accent">na Serra dos Matões</span>
          </h2>
        </motion.div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-serra-dark/60 via-transparent to-serra-dark/20 pointer-events-none" />
    </div>
  );
};

interface BookingBarProps {
  startDate: Date | null;
  endDate: Date | null;
  onChangeDates: (dates: [Date | null, Date | null]) => void;
  guests: number;
  setGuests: (n: number) => void;
  onSearch: () => void;
  isDateFullyBooked: (date: Date) => boolean;
}

const BookingBar: React.FC<BookingBarProps> = ({ startDate, endDate, onChangeDates, guests, setGuests, onSearch, isDateFullyBooked }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative -mt-20 z-30 px-4 max-w-5xl mx-auto">
      <div className="bg-serra-dark rounded-2xl shadow-2xl p-4 md:p-6 border-t-4 border-serra-accent">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow bg-white rounded-lg flex flex-col md:flex-row md:divide-x divide-gray-200 shadow-inner">
            <div className="flex-1 px-4 py-2 hover:bg-gray-50 transition-colors relative group rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CalendarIcon size={10} className="text-serra-accent" /> Check-in / Check-out
              </label>
              <div className="w-full -ml-2 relative">
                 <DatePicker
                  selectsRange={true}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={onChangeDates}
                  minDate={new Date()}
                  monthsShown={isMobile ? 1 : 2}
                  locale="pt-BR"
                  dateFormat="dd MMM"
                  placeholderText="Adicionar datas"
                  className="w-full bg-transparent text-serra-dark font-semibold text-base placeholder-gray-400 focus:outline-none cursor-pointer px-2 py-1"
                  calendarClassName="font-sans"
                  popperPlacement="bottom-start"
                  popperModifiers={[
                    { name: "offset", options: { offset: [-10, 10] } },
                    { name: "preventOverflow", options: { rootBoundary: "viewport", tether: false, altAxis: true } }
                  ]}
                  filterDate={(date) => !isDateFullyBooked(date)}
                  renderDayContents={(day, date) => {
                    const fullyBooked = isDateFullyBooked(date ?? new Date());
                    if (!fullyBooked) return <span>{day}</span>;
                    return (
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1, gap: '2px' }}>
                        <span style={{ textDecoration: 'line-through', textDecorationColor: 'rgba(220,38,38,0.45)', textDecorationThickness: '1.5px' }}>{day}</span>
                        <span style={{ fontSize: '7px', fontWeight: 700, color: 'rgba(220,38,38,0.55)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1 }}>Lotado</span>
                      </span>
                    );
                  }}
                />
              </div>
            </div>
            <div className="w-full md:w-48 px-4 py-2 hover:bg-gray-50 transition-colors border-t md:border-t-0 border-gray-100 rounded-b-lg md:rounded-r-lg md:rounded-bl-none">
               <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Users size={10} className="text-serra-accent" /> Hóspedes
              </label>
              <select 
                value={guests} 
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full bg-transparent text-serra-dark font-semibold text-base focus:outline-none cursor-pointer appearance-none py-1"
              >
                <option value={1}>1 Adulto</option>
                <option value={2}>2 Adultos</option>
              </select>
            </div>
          </div>
          <button 
            onClick={onSearch}
            className="md:w-auto bg-serra-accent hover:bg-white hover:text-serra-dark text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 uppercase tracking-widest text-sm shadow-lg hover:shadow-serra-accent/50 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Search size={18} />
            <span className="md:hidden lg:inline">Pesquisar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface HomeProps {
  dateRange: [Date | null, Date | null];
  setDateRange: (update: [Date | null, Date | null]) => void;
  guests: number;
  setGuests: (n: number) => void;
}

const Home: React.FC<HomeProps> = ({ dateRange, setDateRange, guests, setGuests }) => {
  const [startDate, endDate] = dateRange;
  const [chalets, setChalets] = useState<Chalet[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [prices, setPrices] = useState<CustomPrice[]>([]);

  useEffect(() => {
    const fetchData = async () => {
       const [c, r, p] = await Promise.all([
         ChaletService.getAll(),
         ReservationService.getAll(),
         PricingService.getAll()
       ]);
       setChalets(c);
       setReservations(r);
       setPrices(p);
    };
    fetchData();
  }, []);

  const scrollToChalets = () => {
    const element = document.getElementById('chales');
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const checkAvailability = (chaletId: string): boolean => {
    if (!startDate || !endDate) return true;
    return ReservationService.checkCollisionLocal(
      reservations,
      prices,
      chalets,
      chaletId,
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd')
    );
  };

  const isDateFullyBooked = (date: Date): boolean => {
    if (chalets.length === 0) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    const nextDay = addDays(date, 1);
    const nextDayStr = format(nextDay, 'yyyy-MM-dd');

    return chalets.every(chalet => {
      return !ReservationService.checkCollisionLocal(
        reservations,
        prices,
        chalets,
        chalet.id,
        dateStr,
        nextDayStr
      );
    });
  };

  const calculateTotalPrice = (chaletId: string): number => {
    if (!startDate || !endDate) return 0;
    
    let total = 0;
    let currentDate = new Date(startDate);
    while (currentDate < endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const price = PricingService.calculateDayPrice(prices, chalets, chaletId, dateStr);
      total += price;
      currentDate = addDays(currentDate, 1);
    }
    return total;
  };

  const handleReservation = (chaletName: string, total?: number) => {
    if (!startDate || !endDate) {
      alert("Por favor, selecione as datas de Check-in e Check-out na barra de busca superior para verificar a disponibilidade.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const formattedStart = format(startDate, 'dd/MM/yyyy');
    const formattedEnd = format(endDate, 'dd/MM/yyyy');
    
    let message = `Olá! Gostaria de reservar o *${chaletName}*.\n\n📅 Entrada: ${formattedStart}\n📅 Saída: ${formattedEnd}\n👥 Adultos: ${guests}`;
    if (total) {
      message += `\n💰 Valor Total Estimado: ${formatCurrency(total)}`;
    }
    message += `\n\nAguardo confirmação de disponibilidade.`;
    
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const isSearching = startDate && endDate;
  const nights = (startDate && endDate) ? differenceInCalendarDays(endDate, startDate) : 0;

  return (
    <div className="animate-fade-in pb-20">
      <HeroSlider />
      <BookingBar 
        startDate={startDate} endDate={endDate} onChangeDates={setDateRange}
        guests={guests} setGuests={setGuests} onSearch={scrollToChalets}
        isDateFullyBooked={isDateFullyBooked}
      />

      <div id="chales" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        
        <div className="text-center mb-16">
          {isSearching ? (
             <motion.div 
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-green-50 border border-green-200 rounded-xl p-6 max-w-3xl mx-auto shadow-sm"
             >
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-left">
                     <div className="bg-green-100 p-3 rounded-full text-green-600">
                        <CalendarCheck size={28} />
                     </div>
                     <div>
                        <h4 className="font-bold text-green-800 text-lg">Datas Selecionadas</h4>
                        <p className="text-green-700 text-sm">
                           {format(startDate, 'dd/MM/yyyy')} até {format(endDate, 'dd/MM/yyyy')} • <strong>{nights} diárias</strong>
                        </p>
                     </div>
                  </div>
                  <button 
                    onClick={() => setDateRange([null, null])}
                    className="text-sm font-bold text-gray-500 hover:text-red-500 flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 hover:border-red-200 transition-all shadow-sm"
                  >
                     <RotateCcw size={14}/> Limpar Filtro
                  </button>
                </div>
             </motion.div>
          ) : (
            <>
              <h3 className="font-serif text-3xl md:text-5xl text-serra-dark mb-4">Nossas Acomodações</h3>
              <div className="h-1 w-24 bg-serra-accent mx-auto rounded-full"></div>
              <p className="mt-6 text-gray-600 max-w-2xl mx-auto font-light text-lg">
                Escolha o cenário perfeito para sua história na montanha.
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {chalets.map((chalet) => {
            const isAvailable = checkAvailability(chalet.id);
            const total = isSearching && isAvailable ? calculateTotalPrice(chalet.id) : 0;
            
            return (
            <div 
              key={chalet.id} 
              className={`group bg-white rounded-xl overflow-hidden transition-all duration-500 flex flex-col relative ${
                isSearching 
                  ? (isAvailable ? 'ring-2 ring-green-500 shadow-xl scale-[1.02] z-10' : 'opacity-60 grayscale-[0.8] shadow-none scale-95') 
                  : 'shadow-md hover:shadow-2xl'
              }`}
            >
              {isSearching && isAvailable && (
                 <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-xs font-bold py-1 text-center uppercase tracking-widest z-30 shadow-md flex items-center justify-center gap-2">
                     <Sparkles size={12} /> Disponível neste período
                 </div>
              )}

              <div className="h-64 overflow-hidden relative">
                {!isAvailable && (
                  <div className="absolute inset-0 bg-white/40 z-30 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="text-center bg-white/90 p-4 rounded-xl shadow-lg border border-red-100">
                       <span className="text-red-600 font-bold uppercase tracking-widest flex items-center justify-center gap-2 mb-1">
                         <Ban size={20} /> Indisponível
                       </span>
                       {isSearching && <p className="text-xs text-gray-500">Reservado nessas datas</p>}
                    </div>
                  </div>
                )}
                
                <Link to={isAvailable ? `/chale/${chalet.slug}` : '#'}>
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
                  <img src={chalet.coverImage} alt={chalet.name} className={`w-full h-full object-cover transform transition-transform duration-700 ${isAvailable ? 'group-hover:scale-110' : ''}`} />
                </Link>
                
                {!isSearching && (
                   <div className="absolute top-4 right-4 z-20">
                      <span className="bg-white/90 backdrop-blur text-serra-dark text-xs font-bold px-3 py-1 rounded uppercase tracking-wide shadow-md border border-gray-100">
                       A partir de {formatCurrency(chalet.basePrice)}
                      </span>
                   </div>
                )}
              </div>

              <div className="p-6 flex-grow flex flex-col">
                <div className="mb-4">
                  <h4 className="font-serif text-2xl text-serra-dark mb-1 group-hover:text-serra-accent transition-colors">
                    <Link to={`/chale/${chalet.slug}`}>{chalet.name}</Link>
                  </h4>
                  <p className="text-sm text-gray-500 line-clamp-2 font-light">{chalet.description}</p>
                </div>
                
                <div className="flex gap-3 mb-6 text-serra-dark/70 border-b border-gray-100 pb-4">
                  {chalet.amenities.slice(0, 4).map((item, i) => (
                    <div key={i} className="tooltip" title={item}>{getAmenityIcon(item)}</div>
                  ))}
                  {chalet.amenities.length > 4 && <span className="text-xs text-gray-400 self-center">+{chalet.amenities.length - 4}</span>}
                </div>

                <div className="mt-auto">
                   {isSearching && isAvailable ? (
                     <div className="bg-green-50 rounded-lg p-4 border border-green-100 mb-4 animate-fade-in">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-xs text-green-700 font-bold uppercase tracking-wide">Orçamento Total</span>
                          <span className="text-xs text-green-600 bg-white px-2 py-0.5 rounded-full border border-green-100">{nights} diárias</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-gray-800">{formatCurrency(total)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Impostos e taxas inclusos</p>
                     </div>
                   ) : null}

                   <div className="flex flex-col gap-2">
                     <button 
                        onClick={() => handleReservation(chalet.name, total)} 
                        disabled={!isAvailable} 
                        className={`w-full font-bold py-3.5 rounded-lg transition-all uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] ${
                          isAvailable 
                            ? 'bg-serra-accent hover:bg-serra-copper text-white' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                        }`}
                     >
                       {isSearching 
                          ? (isAvailable ? <><CreditCard size={18}/> Reservar Agora</> : 'Indisponível') 
                          : 'Verificar Disponibilidade'
                       }
                     </button>
                     <Link to={`/chale/${chalet.slug}`} className="w-full text-center text-gray-400 hover:text-serra-dark text-xs uppercase tracking-widest font-medium transition-colors py-2">
                       Ver detalhes e fotos
                     </Link>
                   </div>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      </div>
      
      {/* Seção Onde Estamos (Localização) */}
      <Location />
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [guests, setGuests] = useState(2);

  return (
    <HashRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home dateRange={dateRange} setDateRange={setDateRange} guests={guests} setGuests={setGuests} />} />
            <Route path="/chale/:slug" element={<ChaletDetailsWrapper />} />
            <Route path="/galeria" element={<Gallery />} />
            <Route path="/login" element={<Login />} />
            <Route path="/politicas" element={<Policies />} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/conversas" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          </Routes>
        </Layout>
      </AuthProvider>
    </HashRouter>
  );
};

const ChaletDetailsWrapper = () => {
  const { slug } = useParams<{ slug: string }>();
  const [chalet, setChalet] = useState<Chalet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChalet = async () => {
      const allChalets = await ChaletService.getAll();
      const found = allChalets.find(c => c.slug === slug);
      setChalet(found || null);
      setLoading(false);
    };
    fetchChalet();
  }, [slug]);

  if (loading) return null;
  if (!chalet) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center flex-col pt-32">
        <h2 className="font-serif text-2xl mb-4 text-serra-dark">Chalé não encontrado</h2>
        <Link to="/" className="text-serra-accent hover:underline">Voltar para a Home</Link>
      </div>
    );
  }
  return <ChaletDetails chalet={chalet} />;
};

export default App;
