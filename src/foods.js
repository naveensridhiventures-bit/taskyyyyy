export const MEALS = [
  { key: 'morning', label: 'Breakfast', time: 'Morning', emoji: '🌅', color: '#ffc531' },
  { key: 'noon', label: 'Lunch', time: 'Noon', emoji: '☀️', color: '#ff8a4c' },
  { key: 'evening', label: 'Snacks', time: 'Evening', emoji: '🍵', color: '#3ddc97' },
  { key: 'night', label: 'Dinner', time: 'Night', emoji: '🌙', color: '#8b6cff' }
]

export const FOODS = {
  morning: ['Idli', 'Dosa', 'Masala Dosa', 'Rava Dosa', 'Set Dosa', 'Pesarattu', 'Uttapam', 'Pongal', 'Ven Pongal', 'Upma', 'Rava Kichadi', 'Medu Vada', 'Poori', 'Poori Masala', 'Idiyappam', 'Appam', 'Puttu', 'Kuzhi Paniyaram', 'Ragi Dosa', 'Ragi Kali', 'Oats', 'Sambar', 'Coconut Chutney', 'Tomato Chutney', 'Podi + Oil', 'Kesari', 'Filter Coffee', 'Tea', 'Milk', 'Boiled Egg', 'Omelette', 'Banana'],
  noon: ['Rice', 'Sambar Rice', 'Rasam Rice', 'Curd Rice', 'Lemon Rice', 'Tamarind Rice', 'Tomato Rice', 'Coconut Rice', 'Bisi Bele Bath', 'Veg Biryani', 'Chicken Biryani', 'Mutton Biryani', 'Full Meals', 'Sambar', 'Rasam', 'Vatha Kuzhambu', 'Mor Kuzhambu', 'Kara Kuzhambu', 'Kootu', 'Poriyal', 'Avial', 'Keerai', 'Beans Poriyal', 'Potato Fry', 'Fish Curry', 'Fish Fry', 'Chicken Curry', 'Chicken 65', 'Egg Curry', 'Mutton Curry', 'Appalam', 'Pickle', 'Buttermilk', 'Payasam', 'Chapati'],
  evening: ['Filter Coffee', 'Tea', 'Sundal', 'Mixed Sprouts', 'Boiled Corn', 'Medu Vada', 'Masala Vada', 'Molaga Bajji', 'Onion Pakoda', 'Bonda', 'Samosa', 'Murukku', 'Mixture', 'Banana Chips', 'Peanuts', 'Roasted Chana', 'Kuzhi Paniyaram', 'Poha', 'Fruit Bowl', 'Banana', 'Apple', 'Papaya', 'Almonds', 'Buttermilk', 'Coconut Water', 'Sugarcane Juice', 'Protein Shake', 'Boiled Egg', 'Biscuits'],
  night: ['Chapati', 'Phulka', 'Dosa', 'Idli', 'Ragi Dosa', 'Ragi Mudde', 'Parotta', 'Kothu Parotta', 'Upma', 'Pongal', 'Rice', 'Curd Rice', 'Kanji', 'Oats', 'Sambar', 'Dal', 'Veg Kurma', 'Paneer Curry', 'Egg Curry', 'Omelette', 'Chicken Curry', 'Fish Curry', 'Coconut Chutney', 'Tomato Chutney', 'Salna', 'Poriyal', 'Salad', 'Milk', 'Banana', 'Fruit Bowl']
}

export const TOPICS = ['React', 'JavaScript', 'Python', 'DSA', 'System Design', 'SQL', 'English', 'Communication', 'Aptitude', 'Reading']

// approx [kcal, protein g] for one normal serving
export const NUTR = {
  'Idli': [120, 4], 'Dosa': [130, 3], 'Masala Dosa': [250, 5], 'Rava Dosa': [150, 3], 'Set Dosa': [200, 5], 'Pesarattu': [170, 8], 'Uttapam': [180, 5], 'Pongal': [240, 6], 'Ven Pongal': [240, 6], 'Upma': [200, 5], 'Rava Kichadi': [220, 5], 'Medu Vada': [280, 8], 'Poori': [300, 5], 'Poori Masala': [380, 8], 'Idiyappam': [200, 4], 'Appam': [180, 3], 'Puttu': [220, 5], 'Kuzhi Paniyaram': [200, 5], 'Ragi Dosa': [130, 3], 'Ragi Kali': [200, 5], 'Oats': [150, 5], 'Sambar': [90, 4], 'Coconut Chutney': [60, 1], 'Tomato Chutney': [40, 1], 'Podi + Oil': [70, 2], 'Kesari': [250, 3], 'Filter Coffee': [70, 2], 'Tea': [50, 1], 'Milk': [120, 6], 'Boiled Egg': [78, 6], 'Omelette': [130, 9], 'Banana': [105, 1],
  'Rice': [200, 4], 'Sambar Rice': [320, 10], 'Rasam Rice': [280, 6], 'Curd Rice': [300, 8], 'Lemon Rice': [300, 5], 'Tamarind Rice': [320, 5], 'Tomato Rice': [300, 5], 'Coconut Rice': [330, 5], 'Bisi Bele Bath': [350, 10], 'Veg Biryani': [380, 8], 'Chicken Biryani': [500, 25], 'Mutton Biryani': [550, 26], 'Full Meals': [750, 20], 'Rasam': [40, 1], 'Vatha Kuzhambu': [110, 3], 'Mor Kuzhambu': [90, 3], 'Kara Kuzhambu': [110, 3], 'Kootu': [120, 5], 'Poriyal': [90, 2], 'Avial': [150, 3], 'Keerai': [80, 4], 'Beans Poriyal': [80, 2], 'Potato Fry': [180, 2], 'Fish Curry': [180, 22], 'Fish Fry': [250, 24], 'Chicken Curry': [250, 25], 'Chicken 65': [300, 22], 'Egg Curry': [200, 12], 'Mutton Curry': [300, 24], 'Appalam': [50, 2], 'Pickle': [30, 0], 'Buttermilk': [40, 2], 'Payasam': [250, 5], 'Chapati': [100, 3],
  'Sundal': [140, 7], 'Mixed Sprouts': [120, 8], 'Boiled Corn': [130, 4], 'Masala Vada': [180, 6], 'Molaga Bajji': [150, 3], 'Onion Pakoda': [200, 4], 'Bonda': [180, 3], 'Samosa': [260, 4], 'Murukku': [150, 2], 'Mixture': [200, 5], 'Banana Chips': [150, 1], 'Peanuts': [170, 7], 'Roasted Chana': [120, 7], 'Poha': [180, 4], 'Fruit Bowl': [100, 1], 'Apple': [95, 0], 'Papaya': [60, 1], 'Almonds': [80, 3], 'Coconut Water': [45, 0], 'Sugarcane Juice': [180, 0], 'Protein Shake': [150, 24], 'Biscuits': [100, 1],
  'Phulka': [80, 3], 'Parotta': [300, 6], 'Kothu Parotta': [450, 14], 'Kanji': [150, 4], 'Dal': [150, 9], 'Veg Kurma': [180, 4], 'Paneer Curry': [280, 13], 'Salna': [150, 5], 'Salad': [60, 2], 'Ragi Mudde': [200, 5]
}
export const KCAL_GOAL = 2000
export const PROTEIN_GOAL = 80
export const nutrition = items => items.reduce((a, f) => { const n = NUTR[f]; return n ? { kcal: a.kcal + n[0], protein: a.protein + n[1] } : a }, { kcal: 0, protein: 0 })
