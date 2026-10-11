/**
 * Google Apps Script for Truk Dealil IL (טראק דיל il)
 * Copy this code and deploy it as a Web App in Google Apps Script.
 * 
 * Target Spreadsheet ID: 1Hch4csBenIwr9vt6XlyzTQ0z88LIo1917w0NPYKXqTc
 * Target Google Drive Folder: 1_9vxDiPP51-GtUEeqsojmp5d1z7D8UoG
 */

var TARGET_SPREADSHEET_ID = "1Hch4csBenIwr9vt6XlyzTQ0z88LIo1917w0NPYKXqTc";

function getTargetSpreadsheet(data) {
  var id = (data && data.sheetId) || TARGET_SPREADSHEET_ID;
  try {
    if (id) {
      return SpreadsheetApp.openById(id);
    }
  } catch (err) {
    Logger.log("Error opening by ID: " + err.toString());
  }
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (err) {}
  return SpreadsheetApp.create("טראק דיל il - ניהול הובלות");
}

// Handle POST request from the web application or backend proxy
function doPost(e) {
  try {
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    
    // Determine action
    var action = data.action;
    
    if (action === "create_move") {
      return handleCreateMove(data);
    } else if (action === "create_lead") {
      return handleCreateLead(data);
    } else if (action === "add_bid") {
      return handleAddBid(data);
    } else if (action === "approve_bid") {
      return handleApproveBid(data);
    } else if (action === "update_payment") {
      return handleUpdatePayment(data);
    } else if (action === "test_connection") {
      return handleTestConnection(data);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Unknown action: " + action
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (err) {
    Logger.log("Error: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle test connection
function handleTestConnection(data) {
  var spreadsheet = getTargetSpreadsheet(data);
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "חיבור תקין מול Google Sheets",
    spreadsheetName: spreadsheet ? spreadsheet.getName() : "Unknown",
    spreadsheetId: spreadsheet ? spreadsheet.getId() : TARGET_SPREADSHEET_ID
  })).setMimeType(ContentService.MimeType.JSON);
}

// Handle new move request
function handleCreateMove(data) {
  var spreadsheet = getTargetSpreadsheet(data);
  var sheet = spreadsheet.getSheetByName("משלוחים");
  if (!sheet) {
    sheet = spreadsheet.insertSheet("משלוחים");
    // Add headers if sheet is new
    sheet.appendRow([
      "מזהה הובלה", "שם לקוח", "טלפון", "אימייל", "כתובת מוצא", "כתובת יעד", 
      "תאריך", "שעה", "סוג הובלה", "קומה", "מעלית", "גישה למשאית", 
      "מנוף", "טווח מחיר AI", "מדד קושי", "סיכום פריטים", "הערות", 
      "תאריך רישום", "קישור להצעות נהגים", "תיקיית דרייב לתמונות"
    ]);
  }
  
  var folderId = "1_9vxDiPP51-GtUEeqsojmp5d1z7D8UoG";
  var folderUrl = "";
  var uploadedCount = 0;
  
  try {
    var parentFolder = DriveApp.getFolderById(folderId);
    // Create a sub-folder for this specific move
    var moveFolder = parentFolder.createFolder("Move_" + data.moveId + "_" + (data.clientName || "Unknown"));
    folderUrl = moveFolder.getUrl();
    
    // Upload files
    if (data.images && data.images.length > 0) {
      for (var i = 0; i < data.images.length; i++) {
        var base64Data = data.images[i];
        if (base64Data && base64Data.indexOf(",") > -1) {
          var contentType = base64Data.split(",")[0].split(":")[1].split(";")[0];
          var rawBase64 = base64Data.split(",")[1];
          var decoded = Utilities.base64Decode(rawBase64);
          var blob = Utilities.newBlob(decoded, contentType, "תמונה_" + (i + 1) + "_" + data.moveId);
          moveFolder.createFile(blob);
          uploadedCount++;
        }
      }
    }
  } catch (driveErr) {
    Logger.log("Drive upload failed: " + driveErr.toString());
    folderUrl = "שגיאה ביצירת תיקייה: " + driveErr.toString();
  }
  
  // Format items array into text
  var itemsText = "";
  if (data.items && data.items.length > 0) {
    itemsText = data.items.map(function(item) {
      return item.name + " (" + item.quantity + ")";
    }).join(", ");
  }

  sheet.appendRow([
    data.moveId,
    data.clientName,
    "'" + data.clientPhone, // single quote prevents Excel truncating leading zero
    data.clientEmail,
    data.originAddress,
    data.destAddress,
    data.moveDate,
    data.moveTime,
    data.moveType,
    data.floor,
    data.hasElevator ? "כן" : "לא",
    data.truckAccess,
    data.craneNeeded,
    data.estimatedPriceRange || "",
    data.difficultyScore || "",
    itemsText,
    data.notes || "",
    new Date(),
    data.bidLink || "",
    folderUrl
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    moveId: data.moveId,
    uploadedImages: uploadedCount,
    folderUrl: folderUrl
  })).setMimeType(ContentService.MimeType.JSON);
}

// Handle CRM landing leads registration
function handleCreateLead(data) {
  var spreadsheet = getTargetSpreadsheet(data);
  var sheet = spreadsheet.getSheetByName("לידים");
  if (!sheet) {
    sheet = spreadsheet.insertSheet("לידים");
    sheet.appendRow(["מזהה ליד", "שם מלא", "טלפון", "אימייל", "חברה", "הערות", "תאריך רישום"]);
  }
  
  sheet.appendRow([
    data.leadId,
    data.fullName,
    "'" + data.phone,
    data.email,
    data.companyName || "",
    data.notes || "",
    new Date()
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    leadId: data.leadId
  })).setMimeType(ContentService.MimeType.JSON);
}

// Handle adding a driver bid
function handleAddBid(data) {
  var spreadsheet = getTargetSpreadsheet(data);
  var sheet = spreadsheet ? spreadsheet.getSheetByName("הצעות נהגים") : null;
  if (spreadsheet && !sheet) {
    sheet = spreadsheet.insertSheet("הצעות נהגים");
    sheet.appendRow(["מזהה הובלה", "מזהה הצעה", "שם נהג", "טלפון נהג", "סכום הצעה", "הערות נהג", "תאריך הגשה"]);
  }
  
  if (sheet) {
    sheet.appendRow([
      data.moveId,
      data.bidId,
      data.driverName,
      "'" + data.driverPhone,
      data.bidAmount,
      data.notes || "",
      new Date()
    ]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    bidId: data.bidId
  })).setMimeType(ContentService.MimeType.JSON);
}

// Handle bid approval
function handleApproveBid(data) {
  var spreadsheet = getTargetSpreadsheet(data);
  var sheet = spreadsheet ? spreadsheet.getSheetByName("אישורי הצעות") : null;
  if (spreadsheet && !sheet) {
    sheet = spreadsheet.insertSheet("אישורי הצעות");
    sheet.appendRow(["מזהה הובלה", "מזהה הצעה", "שם נהג", "טלפון נהג", "סכום מאושר", "תאריך אישור"]);
  }
  
  if (sheet) {
    sheet.appendRow([
      data.moveId,
      data.bidId,
      data.driverName,
      "'" + data.driverPhone,
      data.bidAmount,
      new Date()
    ]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Bid approved logged"
  })).setMimeType(ContentService.MimeType.JSON);
}

// Handle payment status changes
function handleUpdatePayment(data) {
  var spreadsheet = getTargetSpreadsheet(data);
  var sheet = spreadsheet ? spreadsheet.getSheetByName("תשלומים") : null;
  if (spreadsheet && !sheet) {
    sheet = spreadsheet.insertSheet("תשלומים");
    sheet.appendRow(["מזהה הובלה", "סטטוס תשלום", "אושר לחיוב", "סכום", "תאריך"]);
  }
  if (sheet) {
    sheet.appendRow([
      data.moveId,
      data.paymentStatus,
      data.clientApprovedForBilling ? "כן" : "לא",
      data.amount || "",
      new Date()
    ]);
  }
  Logger.log("Payment update: Move ID " + data.moveId + ", Payment Status: " + data.paymentStatus);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Payment status logged"
  })).setMimeType(ContentService.MimeType.JSON);
}

// Enable simple GET request check for web testing
function doGet(e) {
  return ContentService.createTextOutput("טראק דיל il - שירות ה-Webhook של Google Apps Script פעיל ותקין.").setMimeType(ContentService.MimeType.TEXT);
}
