import React, { useState, useEffect } from 'react';

const WeatherTimeWidget = ({ className = '' }) => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: '--', icon: '☁️', loading: true });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async (lat, lon) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await res.json();
        const current = data.current_weather;
        if (current) {
          let icon = '☁️';
          if (current.weathercode === 0) icon = '☀️';
          else if (current.weathercode <= 3) icon = '⛅';
          else if (current.weathercode <= 49) icon = '🌫️';
          else if (current.weathercode <= 69) icon = '🌧️';
          else if (current.weathercode <= 79) icon = '🌨️';
          else icon = '⛈️';
          
          setWeather({
            temp: Math.round(current.temperature),
            icon,
            loading: false
          });
        }
      } catch (err) {
        setWeather({ temp: '--', icon: '☁️', loading: false });
      }
    };

    // Default to Chennai, India
    fetchWeather(13.0827, 80.2707);
    
    // Try to get user's location silently
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => {} // fallback to default
      );
    }
  }, []);

  return (
    <div className={`flex items-center gap-3 px-3 py-1.5 bg-accent-light/50 border border-border/50 rounded-full text-sm font-medium text-text-main shadow-sm ${className}`}>
      <div className="flex items-center gap-1.5" title="Weather">
        <span className="text-lg leading-none">{weather.icon}</span>
        <span>{weather.loading ? '--' : `${weather.temp}°C`}</span>
      </div>
      <div className="w-px h-4 bg-border/80"></div>
      <div className="flex items-center tracking-wide" title="Local Time">
        {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
      </div>
    </div>
  );
};

export default WeatherTimeWidget;
