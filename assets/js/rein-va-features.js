/* ══════════════════════════════════════════════════════════
   REIN MLS (Virginia): Features and Rooms / Units
   Mirrors pages 3 and 4 of the REIN "Residential Property Data Input
   & Features" form (07/01/2025), the document agents fill in before the
   listing is keyed into the MLS, so every option in the practice form
   matches the paper form. Uses vaf() from the role page.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* [field id, label, required, max picks (0 = as applicable), options] */
  var FEATURE_GROUPS = [
    ['Rooms & Interior', [
      ['other-rooms', 'Other Rooms', false, 0, ['1st Floor BR', '1st Floor PBR', 'Assigned Storage', 'Attic', 'Balcony', 'Breakfast Area', 'Converted Garage', 'Fin Rm Over Garage', 'Foyer', 'In-Law Suite', 'Library', 'Loft', 'PBR with Bath', 'None', 'Office/Study', 'Pantry', 'Porch', 'Porch (Screened)', 'Rec Room', 'Spare Room', 'Sun Room', 'UnfinRm Over Garage', 'Utility Closet', 'Utility Room', 'Workshop']],
      ['interior', 'Int Features', false, 0, ['Bar', 'Cathedral Ceiling', 'Cedar Closet', 'Dual Entry Bath (Br & Br)', 'Dual Entry Bath (Br & Hall)', 'Fireplace (decorative/non-functioning)', 'Fireplace (electric)', 'Fireplace (gas-natural)', 'Fireplace (gas-propane)', 'Fireplace (wood)', 'Handicap', 'Primary BR FP', 'Primary Sink-Double', 'Perm Attic Stairs', 'Pull Down Attic Stairs', 'Scuttle Access', 'Skylights', 'Walk-In Attic', 'Walk-in Closet', 'Window Treatments', 'Wood Stove']],
      ['appliances', 'Appliances', true, 0, ['220 Volt Electric', 'Dishwasher', 'Disposal', 'Dryer', 'Dryer Hookup', 'Energy Star Appliance(s)', 'Microwave', 'None', 'Range', 'Range-Gas', 'Range-Elec', 'Refrigerator', 'Trash Compactor', 'Washer', 'Washer Hookup']],
      ['fence', 'Fence', true, 3, ['Backyard Fenced', 'Chain Link', 'Cross Fenced', 'Decorative', 'Dog Run', 'Electric', 'Front Yard Fenced', 'Full', 'None', 'Other', 'Partial', 'Picket', 'Privacy', 'Rail', 'Split Rail', 'Wall', 'Wire', 'Wood Fence']],
      ['pool', 'Pool', true, 2, ['No Pool', 'Pool-Above Ground', 'Pool-In Ground', 'Solar Pool Equipment']]
    ]],
    ['Exterior, Lot & Community', [
      ['ext-features', 'Ext Features', false, 0, ['Corner', 'Cul-de-sac', 'Deck', 'Gazebo', 'Golf Course Lot', 'Horses Allowed', 'Inground Sprinkler', 'Irrigation Control', 'Patio', 'Pump', 'Rain Water Harvesting', 'Tagged Items', 'Tennis Court', 'Well', 'Wind Power', 'Wooded']],
      ['cic-amenities', 'CIC/Condo/POA Amenities', false, 0, ['Boat Slip', 'Cable', 'Coin Operated', 'Clubhouse', 'Dock', 'Elevator', 'Exercise Room', 'Gated Community', 'Golf', 'Ground Maint', 'Other', 'Playgrounds', 'Pool', 'Private Beach', 'RV Storage', 'Security', 'Sewer', 'Tennis Courts', 'Trash Pickup', 'Water']],
      ['waterfront', 'Waterfront', true, 0, ['Bay', 'Boathouse', 'Boat Lift', 'Bulkhead', 'Canal', 'Creek', 'Deep Water', 'Deep Water Access', 'Dock', 'Lake', 'Marsh', 'Navigable', 'Not Waterfront', 'Ocean', 'Pond', 'Riparian Rights', 'River', 'Stream', 'Tidal', 'WF Restrictions']],
      ['view-desc', 'View Description', false, 2, ['Bay', 'Beach', 'City', 'Golf', 'Harbor', 'Marsh', 'Ocean', 'River', 'Water', 'Wooded']],
      ['energy', 'Energy Efficiency', false, 0, ['Insulation-Concrete Formed', 'Insulation- Cellulose', 'Insulation- Spray Foam', 'Other / See Remarks', 'Radiant Barrier', 'Smart Electric Meter', 'Solar Electric System', 'Solar Hot Water', 'Storm Doors', 'Water Heater- Tankless']],
      ['equipment', 'Equipment', false, 0, ['Attic Fan', 'Backup Generator', 'Cable Hookup', 'Ceiling Fan', 'Central Vacuum', 'Electric Vehicle Charging Station', 'Energy Recovery Ventilator', 'Enhanced Air Filtration', 'Garage Door Opener', 'Generator Hookup', 'Greywater Recovery System', 'Hot Tub', 'Intercom', 'Jetted Tub', 'Mechanical Fresh Air', 'None', 'Security System', 'Satellite Dish', 'Sump Pump', 'Tagged Fixtures to be Removed', 'Water Softener']],
      ['add-structures', 'Additional Structures', false, 3, ['ADU', 'Barn', 'Carriage House', 'Det. Workshop', 'Garage Apartment', 'Greenhouse', 'Guest House', 'Other', 'Poolhouse', 'Stable', 'Storage Shed']]
    ]],
    ['Systems & Structure', [
      ['parking', 'Parking', true, 4, ['Garage Att 1 Car', 'Garage Att 2 Car', 'Garage Att 3+ Car', 'Garage Det 1 Car', 'Garage Det 2 Car', 'Garage Det 3+ Car', 'Oversized Gar', 'Parking Garage', 'Unit Garage', '1 Space', '2 Space', '3 Space', '4 Space', 'Assigned/Reserved', 'Converted', 'Carport', 'Covered', 'Lot', 'Close to Mass Transit', 'Multi Car', 'None', 'Off Street', 'Driveway Spc', 'Street']],
      ['heating', 'Heating', true, 4, ['Baseboard', 'Coal', 'Electric', 'Floor Furnace', 'Forced Hot Air', 'Geo-Thermal', 'Heat Pump', 'Heat Pump W/A', 'Hot Water', 'Natural Gas', 'None', 'Oil', 'Other', 'Programmable Thermostat', 'Propane Gas', 'Radiant', 'Radiant Heated Floors', 'Radiator', 'Solar', 'Space', 'Variable Speed', 'Wall Furnace', 'Wood', 'Zoned']],
      ['cooling', 'Cooling', true, 3, ['16+ SEER AC', 'Central Air', 'Geo-Thermal', 'Heat Pump', 'Heat Pump W/A', 'None', 'Other', 'Variable Speed', 'Whole House Fan', 'Window/Wall', 'Zoned']],
      ['ext-siding', 'Exterior', true, 2, ['Aluminum', 'Asbestos', 'Brick', 'Clapboard', 'EIFS', 'Fiber-Cement', 'Log', 'Masonry', 'Other', 'Shingle', 'Stone', 'Stucco', 'Vinyl', 'Wood']],
      ['roof', 'Roof', true, 2, ['Asphalt Shingle', 'Composite', 'Concrete', 'Green', 'Metal', 'Other', 'Poly Skin', 'Reflective', 'Slate', 'Tar and Gravel', 'Tile', 'Vinyl', 'Wood Shingle']],
      ['flooring', 'Flooring', true, 5, ['Bamboo', 'Carpet', 'Ceramic', 'Concrete', 'Cork', 'Laminate/LVP', 'Marble', 'Other', 'Parquet', 'Slate', 'Terrazzo', 'Vinyl', 'Wood']],
      ['style', 'Style', true, 3, ['2 Unit Condo', 'Apartment', 'Bungalow', 'Cape Cod', 'Cluster', 'Colonial', 'Contemporary', 'Cottage', 'Craftsman', 'Farmhouse', 'High Rise (8+)', 'Mid Rise (4-7)', 'Lo Rise (1-3)', 'Log Home', 'Manufactured', 'Mobile Home', 'Modular', 'Other', 'Quadraville', 'Ranch', 'Spanish', 'Split-Level', 'Townhouse', 'Traditional', 'Transitional', 'Tri-Level', 'Twinhome', 'Victorian']],
      ['unit-desc', 'Unit Description', false, 3, ['1 Living Level', '2 Living Levels', '3 Living Levels', 'Campsite', 'Corner Unit', 'Detached Single Family', 'End Unit', 'Loft', 'Penthouse', 'Studio']],
      ['foundation', 'Foundation', true, 2, ['Basement', 'Crawl', 'Other', 'Pile', 'Sealed/Encapsulated Crawl Space', 'Slab']],
      ['miscellaneous', 'Miscellaneous', false, 0, ['Fixer upper', 'Fuel in Tank at Closing Conveys', 'Pet Restrictions', 'Rehabilitated', 'Warranty Plan']],
      ['sustainable', 'Sustainable', false, 0, ['Advanced Framing', 'Concrete Construction', 'Engineered Wood Products', 'Recirculation Hot Water']],
      ['green-cert', 'Green Certifications', false, 0, ['Builders Challenge (DOE)', 'Earth Craft', 'Energy Audit', 'Energy Star Home', 'Environments for Living', 'Healthy Home (Lung Assoc)', 'Home Energy Rating (HER)', 'LEED for Home', 'National Green Bldg Cert.', 'Other Certification']],
      ['accessibility', 'Accessibility', false, 0, ['Adaptable Cabinets', 'Casement/Crank Windows', 'Curbless Shower', 'Elevator', 'Front-mounted Range Controls', 'Grab Bars', 'Hallways 42in Plus', 'Handicap Access', 'Handheld Showerhead', 'Level Flooring', 'Levered Doors', 'Lift', 'Low Pile Carpet', 'Lower Counters', 'Lower Light Switches', 'Main Floor Laundry', 'Offset Shower Controls', 'Pocket Doors', 'Ramp', 'Sliding / Rotating Cabinets', 'Stepless Entrance']]
    ]]
  ];

  /* the dimension rows printed under ROOMS / UNITS on page 4 */
  var ROOM_ROWS = [
    ['living', 'Living Rm.'], ['great', 'Great Rm.'], ['dining', 'Dining Rm.'],
    ['kitchen', 'Kitchen'], ['family', 'Family Rm.'], ['primary', 'Primary Bdm.'],
    ['bedroom', 'Bedroom'], ['fullbath', 'Full Bath']
  ];

  window.reinFeatures = function () {
    return FEATURE_GROUPS.map(function (g) {
      var fields = g[1].map(function (f) {
        var hint = f[3] ? 'Up to ' + f[3] : 'As applicable';
        return vaf(f[0], f[1], '', f[2], 'multiselect', f[4], hint).replace('class="rein-ms"', 'class="rein-ms" data-max="' + f[3] + '"');
      }).join('');
      return '<fieldset><legend>' + g[0].replace('&', '&amp;') + '</legend><div class="lc-form-grid">' + fields + '</div></fieldset>';
    }).join('\n');
  };

  window.reinRooms = function () {
    var rows = ROOM_ROWS.map(function (r) {
      return vaf('room-' + r[0] + '-dims', 'Appx. ' + r[1] + ' Dimen.', '', false, 'text', null, '7 characters') +
             vaf('room-' + r[0] + '-level', 'Level', '', false, 'text', null, '1 character');
    }).join('');
    return '<fieldset><legend>Rooms / Units</legend><div class="lc-form-grid">' +
      vaf('num-rooms', '# Rooms', '', true, 'number') +
      vaf('util-level', 'Util. Level', '', false, 'text', null, '1 character') +
      rows + '</div></fieldset>';
  };

  /* enforce the "Up to N" limits printed on the form */
  document.addEventListener('change', function (e) {
    var box = e.target;
    if (!box || box.type !== 'checkbox' || !box.checked) return;
    var group = box.closest && box.closest('.rein-ms[data-max]');
    if (!group) return;
    var max = parseInt(group.getAttribute('data-max'), 10);
    if (!max) return;
    if (group.querySelectorAll('input:checked').length > max) {
      box.checked = false;
      var field = group.closest('.lc-field');
      var hint = field && field.querySelector('.hint');
      if (hint) {
        hint.textContent = 'Up to ' + max + ' only';
        hint.style.color = '#d2452f';
        setTimeout(function () { hint.textContent = 'Up to ' + max; hint.style.color = ''; }, 1800);
      }
    }
  });
})();
