import { useCallback } from 'react';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { message } from 'antd';
import databaseBridge from '../services/databaseBridge';

const useVehicleAutoFill = () => {
    const { customers, jobIntakes, rentACars, usedItems, lang } = useGlobalState();
 
     const lookupVehicle = useCallback(async (vNo) => {
         if (!vNo || vNo.trim().length < 3) return null;
         
         const normalized = vNo.trim().toUpperCase();
 
         // 1. Search recent intakes (most active records)
         const recentIntake = (jobIntakes || []).find(i => 
             String(i.vehicleNo || '').toUpperCase() === normalized
         );
 
         if (recentIntake) {
             return {
                 customerName: String(recentIntake.customerName || ""),
                 phone: String(recentIntake.phone || ""),
                 foundIn: 'Intake'
             };
         }
 
         // 2. Search Rent-A-Car Fleet
         const rentalCar = (rentACars || []).find(c =>
             String(c.plateNumber || '').toUpperCase() === normalized
         );
 
         if (rentalCar) {
             return {
                 customerName: "Mamun Automobiles (Rental)",
                 phone: rentalCar.phone || "Office",
                 foundIn: 'Rental Fleet'
             };
         }
 
         // 3. Search Used Buy/Sell Inventory
         const usedItem = (usedItems || []).find(u =>
             String(u.name || '').toUpperCase().includes(normalized) ||
             String(u.id || '').toUpperCase() === normalized
         );
 
         if (usedItem) {
             return {
                 customerName: "Mamun Automobiles (Used Hub)",
                 phone: "Used Inventory",
                 foundIn: 'Used Inventory'
             };
         }
 
         // 4. Search Customers database
         const existingCustomer = (customers || []).find(c => 
             String(c.vehicleNo || '').toUpperCase() === normalized
         );
 
         if (existingCustomer) {
             return {
                 customerName: String(existingCustomer.name || ""),
                 phone: String(existingCustomer.phone || ""),
                 foundIn: 'Customer'
             };
         }

         // 5. SEARCH PRODUCTION API (FALLBACK)
         try {
             const apiResult = await databaseBridge.fetchVehicleHistory(normalized);
             if (apiResult) {
                 return apiResult; // Already has customerName, phone, foundIn
             }
         } catch (err) {
             console.error('Vehicle lookup API error:', err);
         }
 
         return null;
     }, [customers, jobIntakes, rentACars, usedItems]);

    const notifyResult = (result, vNo) => {
        if (result) {
            const msg = lang === 'bn' 
                ? `${vNo} এর তথ্য পাওয়া গেছে (${result.foundIn === 'Intake' ? 'সাম্প্রতিক' : 'পুরানো'})`
                : `Found records for ${vNo} (${result.foundIn})`;
            message.success(msg);
        }
    };

    return { lookupVehicle, notifyResult };
};

export default useVehicleAutoFill;
