
import React, { useState, useEffect } from 'react';
import { Chalet } from '../types';
import { WHATSAPP_NUMBER } from '../constants';
import { ReservationService, PricingService, Reservation, CustomPrice } from '../services/storage';
import { formatCurrency, getAmenityIcon } from '../utils/helpers';
import { 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Star,
  XCircle,
  CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { addDays, differenceInDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChaletDetailsProps {
  chalet: Chalet;
}



const ChaletDetails: React.FC<ChaletDetailsProps> = ({ chalet }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [prices, setPrices] = useState<CustomPrice[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [r, p] = await Promise.all([ReservationService.getAll(), PricingService.getAll()]);
      setReservations(r.filter(res => res.chaletId === chalet.id));
      setPrices(p);
    };
    fetchData();
  }, [chalet.id]);

  useEffect(() => {
    if (startDate && endDate) {
      let total = 0;
      let curr = new Date(startDate);
      while (curr < endDate) {
        const dateStr = format(curr, 'yyyy-MM-dd');
        const price = PricingService.calculateDayPrice(prices, [chalet], chalet.id, dateStr);
        total += price;
        curr = addDays(curr, 1);
      }
      setTotalPrice(total);
    } else {
      setTotalPrice(0);
    }
  }, [startDate, endDate, chalet, prices]);

  const onChangeDates = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? chalet.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev === chalet.images.length - 1 ? 0 : prev + 1));
  };

  const isDateBlocked = (date: Date) => {
    return reservations.some(r => {
      const start = parseISO(r.startDate);
      const end = parseISO(r.endDate);
      return date >= start && date < end;
    });
  };

  const handleReservation = () => {
    if (!startDate || !endDate) {
      alert('Por favor, selecione as datas de entrada e saída.');
      return;
    }

    const message = `Olá! Vi no site o *${chalet.name}* e gostaria de reservar.\n\n📅 Entrada: ${format(startDate, 'dd/MM/yyyy')}\n📅 Saída: ${format(endDate, 'dd/MM/yyyy')}\n💰 Valor Total Estimado: ${formatCurrency(totalPrice)}`;
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const renderDayContents = (day: number, date: Date) => {
    const blocked = isDateBlocked(date);
    if (blocked) {
      return (
        <div className="relative w-full h-full flex items-center justify-center text-gray-300 cursor-not-allowed" title="Indisponível">
          <span className="opacity-50">{day}</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <XCircle size={18} className="text-red-500/80" strokeWidth={2.5} />
          </div>
        </div>
      );
    }
    return <span>{day}</span>;
  };

  return (
    <div className="animate-fade-in pb-20 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm">
          <Link to="/" className="text-gray-500 hover:text-serra-accent transition-colors">Home</Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-serra-accent font-medium">{chalet.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h1 className="font-serif text-3xl md:text-5xl text-serra-dark mb-4">{chalet.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1"><Users size={16} className="text-serra-accent"/> {chalet.capacity}</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                <span className="flex items-center gap-1"><Star size={16} className="text-serra-accent fill-serra-accent"/> Vista Exclusiva</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative h-[400px] md:h-[500px] w-full rounded-xl overflow-hidden shadow-md group">
                <img 
                  src={chalet.images[activeImageIndex]} 
                  alt={`${chalet.name} view ${activeImageIndex + 1}`} 
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                
                <button 
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-serra-accent p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-serra-accent p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                {chalet.images.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-24 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all snap-start ${idx === activeImageIndex ? 'border-serra-accent ring-2 ring-serra-accent/20' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="border-y border-gray-200 py-8">
              <h3 className="font-serif text-xl text-serra-dark mb-6">O que esse lugar oferece</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                {chalet.amenities.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-serra-text/80">
                    <span className="p-2 bg-serra-light rounded-full text-serra-accent">
                      {getAmenityIcon(item, 18)}
                    </span>
                    <span className="font-light">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-serif text-xl text-serra-dark mb-4">Sobre a acomodação</h3>
              <p className="text-gray-600 leading-relaxed text-lg font-light">
                {chalet.description}
                <br/><br/>
                Desfrute de uma experiência única de conexão com a natureza. 
                Nossa arquitetura foi pensada para maximizar o conforto sem interferir na paisagem. 
                O silêncio da serra e o ar puro são nossos maiores anfitriões.
              </p>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-28">
              <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="bg-serra-accent p-4 text-center">
                  <p className="text-white text-sm uppercase tracking-widest font-medium">Faça sua pré-reserva</p>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex items-baseline justify-between pb-4 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Diária a partir de</span>
                    <div className="text-right">
                       <span className="font-serif text-2xl text-serra-dark font-bold block">
                         {formatCurrency(chalet.basePrice)}
                       </span>
                    </div>
                  </div>

                  <div className="flex gap-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                     <div className="flex-1 border-r border-gray-200 pr-2">
                       <p className="text-[10px] text-gray-400 uppercase font-bold">Check-in</p>
                       <p className="text-serra-dark font-medium">{startDate ? format(startDate, 'dd/MM/yyyy') : '-'}</p>
                     </div>
                     <div className="flex-1 pl-2">
                       <p className="text-[10px] text-gray-400 uppercase font-bold">Check-out</p>
                       <p className="text-serra-dark font-medium">{endDate ? format(endDate, 'dd/MM/yyyy') : '-'}</p>
                     </div>
                  </div>

                  <div className="chalet-calendar-wrapper border border-gray-200 rounded-xl overflow-hidden">
                    <DatePicker
                      inline
                      calendarClassName="inline-calendar"
                      selected={startDate}
                      onChange={onChangeDates}
                      startDate={startDate}
                      endDate={endDate}
                      selectsRange
                      minDate={new Date()}
                      filterDate={(date) => !isDateBlocked(date)}
                      renderDayContents={renderDayContents}
                      locale={ptBR}
                      monthsShown={1}
                    />
                  </div>
                    
                  {totalPrice > 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in mt-2">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Valor Total</span>
                        <span className="text-xs text-green-600 bg-white px-2 py-0.5 rounded-full border border-green-100">
                            {differenceInDays(endDate!, startDate!)} diárias
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                          <span className="text-3xl font-bold text-gray-800">{formatCurrency(totalPrice)}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2 leading-tight">
                        * Valor estimado. Confirme a disponibilidade e forma de pagamento via WhatsApp.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center italic">
                       * Selecione a data de entrada e saída no calendário acima.
                    </p>
                  )}

                  <button 
                    onClick={handleReservation}
                    disabled={!startDate || !endDate || totalPrice === 0}
                    className={`w-full font-medium py-4 rounded-lg shadow-lg transition-all duration-300 transform flex items-center justify-center gap-2 group mt-2 ${
                      startDate && endDate 
                        ? 'bg-serra-accent hover:bg-serra-dark text-white hover:-translate-y-0.5 shadow-serra-accent/20' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <CreditCard size={18} />
                    <span>{startDate && endDate ? 'Solicitar Reserva' : 'Selecione no Calendário'}</span>
                  </button>

                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">
                      Você será redirecionado para o WhatsApp para finalizar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ChaletDetails;
