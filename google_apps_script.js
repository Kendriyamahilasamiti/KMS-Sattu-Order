/**
 * Google Apps Script - Teej Order Emailer, Sheets Logger & Auto-Formatter (v11)
 * 
 * Instructions:
 * 1. Open Google Sheets.
 * 2. Click "Extensions" -> "Apps Script" in the top menu.
 * 3. Delete any existing code and paste this code.
 * 4. Click Save (Ctrl + S).
 * 5. Click Deploy -> Manage deployments.
 * 6. Click the Pencil icon next to your active deployment, change "Version" to "New version", and click Deploy.
 */

// Aligned exactly with the 7 products in the website's catalog
var productsCatalog = [
  { id: "ready_kolkata_daliya", name: "Kolkata Daliya", category: "READY ATTA SATTU", prices: [190, 375, 750, 940] },
  { id: "ready_mumbai_daliya", name: "Mumbai Daliya", category: "READY ATTA SATTU", prices: [190, 375, 750, 940] },
  { id: "ready_gehu", name: "Gehu", category: "READY ATTA SATTU", prices: [175, 350, 700, 875] },
  { id: "ready_rice", name: "Rice", category: "READY ATTA SATTU", prices: [175, 350, 700, 875] },
  { id: "sika_besan", name: "Besan", category: "SIKA HUA SATTU", prices: [190, 375, 750, 940] },
  { id: "sika_gehu", name: "Gehu", category: "SIKA HUA SATTU", prices: [175, 350, 700, 875] },
  { id: "sika_rice", name: "Rice", category: "SIKA HUA SATTU", prices: [175, 350, 700, 875] }
];
var sizes = ["1/4 kg", "1/2 kg", "1 kg", "1.250 kg"];

// Handle POST request from portal (Submission of new orders)
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0]; // Appends to the first sheet
    
    // 1. Prepare Headers (39 columns)
    var headers = [
      "Timestamp",
      "Order ID",
      "Customer Name",
      "Mobile Number",
      "Email Address",
      "Kshetra",
      "Payment Method",
      "UPI Transaction ID",
      "Total Quantity (packs)",
      "Total Cost",
      "Summary Text"
    ];
    
    productsCatalog.forEach(function(prod) {
      var prefix = (prod.category === "READY ATTA SATTU" ? "Ready" : "Sika") + " - " + prod.name + " ";
      sizes.forEach(function(size) {
        headers.push(prefix + "(" + size + ")");
      });
    });
    
    // Auto-initialize headers if sheet is empty or columns count changed
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    } else {
      var firstRowRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
      var firstRowValues = firstRowRange.getValues()[0];
      if (firstRowValues.length !== headers.length) {
        // Clean up sheet columns and rewrite fresh aligned headers
        sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).clearContent();
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
    
    // 2. Prepare Items Text details for the spreadsheet summary column
    var itemsDetail = "";
    data.items.forEach(function(item) {
      itemsDetail += item.productName + " (" + item.measure + ") x " + item.quantity + "\n";
    });
    
    // 3. Prepare row data values
    var rowValues = [
      new Date(),
      data.id,
      data.customer,
      data.mobile,
      data.email,
      data.kshetra || data.khetra || "-",
      data.paymentMethod,
      data.upiId || "-",
      data.qty,
      data.total,
      itemsDetail
    ];
    
    // Map quantities of each sattu product size to the remaining columns
    productsCatalog.forEach(function(prod) {
      sizes.forEach(function(size) {
        var foundQty = 0;
        data.items.forEach(function(item) {
          var itemCategory = item.category;
          if (item.productName === prod.name && itemCategory === prod.category && item.measure === size) {
            foundQty = item.quantity;
          }
        });
        rowValues.push(foundQty); // Set quantity or 0
      });
    });
    
    // Save to Google Sheet
    sheet.appendRow(rowValues);
    
    // Apply Sheet Formatting & Auto-Fit
    beautifySheet(sheet);
    
    // Generate/Update the Consolidated Report Sheet
    generateConsolidatedReport(ss, sheet);
    
    // 4. Send HTML Email to Customer
    var tbodyHTML = "";
    data.items.forEach(function(item) {
      var displayName = item.productName + " (" + item.category + ")";
      tbodyHTML += '<tr>' +
        '<td style="padding: 8px; border: 1px solid #ddd;">' + displayName + '</td>' +
        '<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">' + item.measure + '</td>' +
        '<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">' + item.quantity + '</td>' +
        '<td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹' + item.price.toFixed(2) + '</td>' +
        '<td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹' + item.amount.toFixed(2) + '</td>' +
        '</tr>';
    });
    
    var emailBody = 
      '<div style="font-family: \'Outfit\', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; background: #fafafa; color: #1f2937;">' +
        '<div style="text-align: center; border-bottom: 2px solid #d97706; padding-bottom: 15px; margin-bottom: 20px;">' +
          '<h2 style="color: #065f46; margin: 0; font-size: 1.6rem;">Kendriya Mahila Samiti</h2>' +
          '<p style="color: #d97706; font-weight: bold; margin: 5px 0 0 0; font-size: 1rem; letter-spacing: 0.5px;">Order Confirmation & Receipt</p>' +
        '</div>' +
        '<p>Dear <strong>' + data.customer + '</strong>,</p>' +
        '<p>Thank you for your order! We have received your request and are processing it.</p>' +
        '<div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">' +
          '<p style="margin: 0 0 8px 0; font-weight: bold; color: #111827;">Order Details:</p>' +
          '<table style="width: 100%; font-size: 0.9rem; line-height: 1.5; border-collapse: collapse;">' +
            '<tr><td style="color: #4b5563; width: 130px; padding: 3px 0;">Order ID:</td><td style="padding: 3px 0;"><strong>' + data.id + '</strong></td></tr>' +
            '<tr><td style="color: #4b5563; padding: 3px 0;">Kshetra / Area:</td><td style="padding: 3px 0;">' + (data.kshetra || data.khetra || "-") + '</td></tr>' +
            '<tr><td style="color: #4b5563; padding: 3px 0;">Mobile Number:</td><td style="padding: 3px 0;">' + data.mobile + '</td></tr>' +
            '<tr><td style="color: #4b5563; padding: 3px 0;">Payment Method:</td><td style="padding: 3px 0;">' + data.paymentMethod + '</td></tr>' +
            (data.upiId && data.upiId !== "-" ? '<tr><td style="color: #4b5563; padding: 3px 0;">UPI Transaction ID:</td><td style="padding: 3px 0;"><strong>' + data.upiId + '</strong></td></tr>' : '') +
            '<tr><td style="color: #4b5563; padding: 3px 0;">Date/Time:</td><td style="padding: 3px 0;">' + data.timestamp + '</td></tr>' +
          '</table>' +
        '</div>' +
        '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">' +
          '<thead style="background: #f3f4f6; color: #374151; font-weight: bold;">' +
            '<tr>' +
              '<th style="padding: 10px 8px; border: 1px solid #ddd; text-align: left;">Product</th>' +
              '<th style="padding: 10px 8px; border: 1px solid #ddd; text-align: center;">Weight</th>' +
              '<th style="padding: 10px 8px; border: 1px solid #ddd; text-align: center;">Qty</th>' +
              '<th style="padding: 10px 8px; border: 1px solid #ddd; text-align: right;">Price</th>' +
              '<th style="padding: 10px 8px; border: 1px solid #ddd; text-align: right;">Amount</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            tbodyHTML +
          '</tbody>' +
          '<tfoot>' +
            '<tr style="font-weight: bold; background: #f9fafb; color: #111827;">' +
              '<td colspan="4" style="padding: 10px 8px; border: 1px solid #ddd; text-align: right; font-size: 0.95rem;">Grand Total:</td>' +
              '<td style="padding: 10px 8px; border: 1px solid #ddd; text-align: right; color: #065f46; font-size: 0.95rem;">₹' + data.total.toFixed(2) + '</td>' +
            '</tr>' +
          '</tfoot>' +
        '</table>' +
        '<p style="font-size: 0.85rem; color: #6b7280; text-align: center; margin-top: 30px; border-top: 1px dashed #d1d5db; padding-top: 15px;">' +
          'This is an automatically generated email from Kendriya Mahila Samiti. Please do not reply directly.' +
        '</p>' +
      '</div>';
      
    // Send the email using Gmail Service
    MailApp.sendEmail({
      to: data.email,
      subject: "Order Confirmation - KMS Ready Sattu [Order ID: " + data.id + "]",
      htmlBody: emailBody
    });
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
      
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
}

// Beautify, align and color-code columns of Google Sheet by sattu category
function beautifySheet(sheet) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow === 0 || lastColumn === 0) return;
  
  // 1. Format Header Row (Row 1)
  sheet.setRowHeight(1, 30);
  sheet.setFrozenRows(1);
  
  // Neutral dark gray for metadata columns (Columns 1 to 11)
  var metaHeaderRange = sheet.getRange(1, 1, 1, Math.min(11, lastColumn));
  metaHeaderRange.setBackground("#374151"); // Charcoal gray
  metaHeaderRange.setFontColor("white");
  metaHeaderRange.setFontWeight("bold");
  metaHeaderRange.setFontSize(10);
  metaHeaderRange.setFontFamily("Outfit");
  metaHeaderRange.setHorizontalAlignment("center");
  metaHeaderRange.setVerticalAlignment("middle");
  
  // Amber/Orange for Ready Sattu columns (Columns 12 to 27: 4 products * 4 sizes)
  if (lastColumn >= 12) {
    var readyHeaderRange = sheet.getRange(1, 12, 1, Math.min(16, lastColumn - 11));
    readyHeaderRange.setBackground("#d97706"); // Brand Orange
    readyHeaderRange.setFontColor("white");
    readyHeaderRange.setFontWeight("bold");
    readyHeaderRange.setFontSize(10);
    readyHeaderRange.setFontFamily("Outfit");
    readyHeaderRange.setHorizontalAlignment("center");
    readyHeaderRange.setVerticalAlignment("middle");
  }
  
  // Emerald Green for Sika Sattu columns (Columns 28 to 39: 3 products * 4 sizes)
  if (lastColumn >= 28) {
    var sikaHeaderRange = sheet.getRange(1, 28, 1, Math.min(12, lastColumn - 27));
    sikaHeaderRange.setBackground("#065f46"); // Brand Green
    sikaHeaderRange.setFontColor("white");
    sikaHeaderRange.setFontWeight("bold");
    sikaHeaderRange.setFontSize(10);
    sikaHeaderRange.setFontFamily("Outfit");
    sikaHeaderRange.setHorizontalAlignment("center");
    sikaHeaderRange.setVerticalAlignment("middle");
  }
  
  // 2. Format Data Rows
  if (lastRow > 1) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, lastColumn);
    dataRange.setFontFamily("Outfit");
    dataRange.setFontSize(10);
    dataRange.setVerticalAlignment("middle");
    
    // Zebra striping (alternating rows)
    for (var r = 2; r <= lastRow; r++) {
      var rowRange = sheet.getRange(r, 1, 1, lastColumn);
      if (r % 2 === 0) {
        rowRange.setBackground("#ffffff");
      } else {
        rowRange.setBackground("#f8fafc"); // Light slate tint
      }
      sheet.setRowHeight(r, 22);
    }
    
    // Align specific columns
    sheet.getRange(2, 1, lastRow - 1, 1).setHorizontalAlignment("center"); // Timestamp
    sheet.getRange(2, 2, lastRow - 1, 1).setHorizontalAlignment("center"); // Order ID
    sheet.getRange(2, 3, lastRow - 1, 1).setHorizontalAlignment("left");   // Name
    sheet.getRange(2, 4, lastRow - 1, 1).setHorizontalAlignment("center"); // Mobile
    sheet.getRange(2, 5, lastRow - 1, 1).setHorizontalAlignment("left");   // Email
    sheet.getRange(2, 6, lastRow - 1, 1).setHorizontalAlignment("center"); // Kshetra
    sheet.getRange(2, 7, lastRow - 1, 1).setHorizontalAlignment("center"); // Payment Method
    sheet.getRange(2, 8, lastRow - 1, 1).setHorizontalAlignment("center"); // UPI ID
    sheet.getRange(2, 9, lastRow - 1, 1).setHorizontalAlignment("center"); // Qty
    sheet.getRange(2, 10, lastRow - 1, 1).setHorizontalAlignment("right"); // Cost
    sheet.getRange(2, 11, lastRow - 1, 1).setHorizontalAlignment("left").setWrap(true); // Summary Text
    
    // Currency format for total cost
    sheet.getRange(2, 10, lastRow - 1, 1).setNumberFormat("₹#,##0.00");
    
    // Center product columns
    if (lastColumn >= 12) {
      var qtyColsRange = sheet.getRange(2, 12, lastRow - 1, lastColumn - 11);
      qtyColsRange.setHorizontalAlignment("center");
    }
  }
  
  // 3. Auto-fit column widths
  for (var col = 1; col <= lastColumn; col++) {
    sheet.autoResizeColumn(col);
    var currentWidth = sheet.getColumnWidth(col);
    sheet.setColumnWidth(col, currentWidth + 12);
  }
  sheet.setColumnWidth(11, 200); // Fixed wrap width for details column
}

// Generate the Consolidated Report sheet
function generateConsolidatedReport(ss, dataSheet) {
  var reportSheet = ss.getSheetByName("Consolidated Report");
  if (!reportSheet) {
    reportSheet = ss.insertSheet("Consolidated Report");
  } else {
    reportSheet.clear(); // Clear old layout to rebuild clean
  }
  
  var dataSheetName = dataSheet.getName();
  
  // 1. Create Title Banner
  reportSheet.getRange("A1:I1").merge();
  var titleCell = reportSheet.getRange("A1");
  titleCell.setValue("Kendriya Mahila Samiti - Sattu Consolidated Orders Summary");
  titleCell.setBackground("#065f46"); // Brand Green
  titleCell.setFontColor("white");
  titleCell.setFontSize(14);
  titleCell.setFontWeight("bold");
  titleCell.setHorizontalAlignment("center");
  titleCell.setVerticalAlignment("middle");
  reportSheet.setRowHeight(1, 40);
  
  // 2. Set Up Kshetra Filter Dropdown in Cell B2
  reportSheet.getRange("A2").setValue("Filter by Kshetra:").setFontWeight("bold").setHorizontalAlignment("right").setFontFamily("Outfit").setFontSize(10);
  var filterCell = reportSheet.getRange("B2");
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["All Kshetras", "Ghatkopar", "Goregaon", "Borivali", "Andheri", "Mulund", "Dakshin Mumbai", "Madhya Mumbai", "Malad"], true)
    .setAllowInvalid(false)
    .build();
  filterCell.setDataValidation(rule);
  if (!filterCell.getValue()) {
    filterCell.setValue("All Kshetras");
  }
  filterCell.setFontFamily("Outfit").setFontSize(10).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#feebc8"); // Soft peach accent
  reportSheet.setRowHeight(2, 24);
  
  // 3. Write Headers
  var headers = [
    "Product Category",
    "Product Name",
    "1/4 kg (packs)",
    "1/2 kg (packs)",
    "1 kg (packs)",
    "1.250 kg (packs)",
    "Total Packs",
    "Total Weight",
    "Total Value"
  ];
  var headerRange = reportSheet.getRange(3, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground("#374151"); // Dark gray
  headerRange.setFontColor("white");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setFontFamily("Outfit");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  reportSheet.setRowHeight(3, 28);
  
  // 4. Write Product Rows
  var rowValues = [];
  var startCol = 12; // Column L in Sheet1
  
  productsCatalog.forEach(function(prod, pIdx) {
    var rNum = rowValues.length + 4; // Row starts at 4
    
    // Find column letters for the 4 sizes
    var colL1 = getColumnLetter(startCol + pIdx * 4);
    var colL2 = getColumnLetter(startCol + pIdx * 4 + 1);
    var colL3 = getColumnLetter(startCol + pIdx * 4 + 2);
    var colL4 = getColumnLetter(startCol + pIdx * 4 + 3);
    
    // Prices of the 4 sizes
    var p1 = prod.prices[0];
    var p2 = prod.prices[1];
    var p3 = prod.prices[2];
    var p4 = prod.prices[3];
    
    // Dynamic formula checking the dropdown selection in B2 (All Kshetras vs specific Kshetra name in Column F of dataSheet)
    var f1 = "=IF($B$2=\"All Kshetras\", SUM('" + dataSheetName + "'!" + colL1 + "2:" + colL1 + "), SUMIFS('" + dataSheetName + "'!" + colL1 + "2:" + colL1 + ", '" + dataSheetName + "'!$F2:$F, $B$2))";
    var f2 = "=IF($B$2=\"All Kshetras\", SUM('" + dataSheetName + "'!" + colL2 + "2:" + colL2 + "), SUMIFS('" + dataSheetName + "'!" + colL2 + "2:" + colL2 + ", '" + dataSheetName + "'!$F2:$F, $B$2))";
    var f3 = "=IF($B$2=\"All Kshetras\", SUM('" + dataSheetName + "'!" + colL3 + "2:" + colL3 + "), SUMIFS('" + dataSheetName + "'!" + colL3 + "2:" + colL3 + ", '" + dataSheetName + "'!$F2:$F, $B$2))";
    var f4 = "=IF($B$2=\"All Kshetras\", SUM('" + dataSheetName + "'!" + colL4 + "2:" + colL4 + "), SUMIFS('" + dataSheetName + "'!" + colL4 + "2:" + colL4 + ", '" + dataSheetName + "'!$F2:$F, $B$2))";
    
    var row = [
      prod.category,
      prod.name,
      f1,
      f2,
      f3,
      f4,
      "=SUM(C" + rNum + ":F" + rNum + ")",
      "=(C" + rNum + "*0.25) + (D" + rNum + "*0.5) + (E" + rNum + "*1) + (F" + rNum + "*1.25)",
      "=(C" + rNum + "*" + p1 + ") + (D" + rNum + "*" + p2 + ") + (E" + rNum + "*" + p3 + ") + (F" + rNum + "*" + p4 + ")"
    ];
    
    rowValues.push(row);
  });
  
  reportSheet.getRange(4, 1, rowValues.length, headers.length).setValues(rowValues);
  
  // 5. Format the Table Styling
  var lastRow = reportSheet.getLastRow();
  var tableRange = reportSheet.getRange(4, 1, lastRow - 3, headers.length);
  tableRange.setFontFamily("Outfit");
  tableRange.setFontSize(10);
  tableRange.setVerticalAlignment("middle");
  
  // Alternating row styling
  for (var r = 4; r <= lastRow; r++) {
    var rowRange = reportSheet.getRange(r, 1, 1, headers.length);
    if (r % 2 === 0) {
      rowRange.setBackground("#ffffff");
    } else {
      rowRange.setBackground("#f8fafc");
    }
    reportSheet.setRowHeight(r, 22);
  }
  
  // Apply specific formats and alignments
  reportSheet.getRange(4, 1, lastRow - 3, 1).setHorizontalAlignment("center"); // Category
  reportSheet.getRange(4, 2, lastRow - 3, 1).setHorizontalAlignment("left");   // Name
  reportSheet.getRange(4, 3, lastRow - 3, 4).setHorizontalAlignment("center"); // Sizes (C to F)
  reportSheet.getRange(4, 7, lastRow - 3, 1).setHorizontalAlignment("center").setFontWeight("bold"); // Total Packs
  reportSheet.getRange(4, 8, lastRow - 3, 1).setHorizontalAlignment("center").setNumberFormat("#,##0.00\" kg\""); // Total Weight
  reportSheet.getRange(4, 9, lastRow - 3, 1).setHorizontalAlignment("right").setNumberFormat("₹#,##0.00").setFontWeight("bold"); // Total Value
  
  // Clear any cached formatting (like currency/weight formats) from the plain pack count columns (C to G)
  reportSheet.getRange(4, 3, lastRow - 3, 5).setNumberFormat("0");
  
  // 6. Grand Total Row
  var totalRowIdx = lastRow + 1;
  reportSheet.getRange(totalRowIdx, 1).setValue("Grand Total").setFontWeight("bold").setHorizontalAlignment("center");
  reportSheet.getRange(totalRowIdx, 1, 1, 2).merge().setBackground("#e2e8f0").setFontWeight("bold");
  
  // Sum size columns (Plain integer format)
  reportSheet.getRange(totalRowIdx, 3).setValue("=SUM(C4:C" + lastRow + ")").setFontWeight("bold").setHorizontalAlignment("center").setBackground("#e2e8f0");
  reportSheet.getRange(totalRowIdx, 4).setValue("=SUM(D4:D" + lastRow + ")").setFontWeight("bold").setHorizontalAlignment("center").setBackground("#e2e8f0");
  reportSheet.getRange(totalRowIdx, 5).setValue("=SUM(E4:E" + lastRow + ")").setFontWeight("bold").setHorizontalAlignment("center").setBackground("#e2e8f0");
  reportSheet.getRange(totalRowIdx, 6).setValue("=SUM(F4:F" + lastRow + ")").setFontWeight("bold").setHorizontalAlignment("center").setBackground("#e2e8f0");
  
  // Sum calculations
  reportSheet.getRange(totalRowIdx, 7).setValue("=SUM(G4:G" + lastRow + ")").setFontWeight("bold").setHorizontalAlignment("center").setBackground("#e2e8f0");
  reportSheet.getRange(totalRowIdx, 8).setValue("=SUM(H4:H" + lastRow + ")").setFontWeight("bold").setHorizontalAlignment("center").setNumberFormat("#,##0.00\" kg\"").setBackground("#e2e8f0");
  reportSheet.getRange(totalRowIdx, 9).setValue("=SUM(I4:I" + lastRow + ")").setFontWeight("bold").setHorizontalAlignment("right").setNumberFormat("₹#,##0.00").setBackground("#e2e8f0");
  reportSheet.setRowHeight(totalRowIdx, 24);
  
  // Clean grand total row cells formats for pack columns
  reportSheet.getRange(totalRowIdx, 3, 1, 5).setNumberFormat("0");
  
  // 7. Auto resize column widths
  for (var col = 1; col <= headers.length; col++) {
    reportSheet.autoResizeColumn(col);
    var currentWidth = reportSheet.getColumnWidth(col);
    reportSheet.setColumnWidth(col, currentWidth + 20);
  }
}

// Helper to convert column index to Letter
function getColumnLetter(colNum) {
  var letter = "";
  while (colNum > 0) {
    var temp = (colNum - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    colNum = (colNum - temp - 1) / 26;
  }
  return letter;
}

// Handle GET request (Unused, kept for backwards compatibility)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    var rows = sheet.getDataRange().getValues();
    
    var orders = [];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (row[1]) {
        orders.push({
          timestamp: row[0],
          id: row[1],
          customer: row[2],
          mobile: row[3],
          email: row[4],
          kshetra: row[5],
          paymentMethod: row[6],
          upiId: row[7],
          qty: row[8],
          total: Number(row[9]),
          itemsText: row[10]
        });
      }
    }
    orders.reverse();
    return ContentService.createTextOutput(JSON.stringify(orders))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
}
