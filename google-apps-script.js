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
    } else if (action === "driver_login") {
      return handleDriverLogin(data);
    } else if (action === "driver_register" || action === "register_driver") {
      return handleRegisterDriver(data);
    } else if (action === "admin_approve_driver") {
      return handleAdminApproveDriver(data);
    } else if (action === "feedback_submitted") {
      return handleFeedbackSubmitted(data);
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

// Handle driver login
function handleDriverLogin(data) {
  var spreadsheet = getTargetSpreadsheet(data);
  var sheet = spreadsheet ? (spreadsheet.getSheetByName("צי רכב") || spreadsheet.getSheetByName("נהגים")) : null;
  
  if (!sheet && spreadsheet) {
    sheet = spreadsheet.insertSheet("צי רכב");
    sheet.appendRow(["מזהה", "שם מלא", "טלפון", "דגם משאית", "מספר רישוי", "סטטוס", "דירוג", "תאריך הצטרפות"]);
    sheet.appendRow(["driver_1", "יוסי לוי", "'0528765432", "משאית 7.5 טון + רמפה הידראולית", "88-442-19", "active", "4.9", new Date()]);
    sheet.appendRow(["driver_2", "אבי כהן", "'0541234567", "משאית 12 טון + מנוף", "12-345-67", "active", "4.8", new Date()]);
    sheet.appendRow(["driver_3", "אמיר מסארווה", "'0509988776", "מסחרית 3.5 טון", "33-445-56", "active", "4.95", new Date()]);
  }
  
  var cleanInputPhone = String(data.phone || "").replace(/\D/g, "");
  
  if (sheet) {
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var rowPhone = String(row[2] || "").replace(/\D/g, "");
      if (rowPhone && (rowPhone === cleanInputPhone || rowPhone.indexOf(cleanInputPhone) !== -1 || cleanInputPhone.indexOf(rowPhone) !== -1)) {
        var status = String(row[5] || "active").toLowerCase();
        if (status === "inactive" || status === "pending") {
          return ContentService.createTextOutput(JSON.stringify({
            status: "pending_approval",
            message: "חשבון הנהג שלך קיים בגיליון אך ממתין לאישור מנהל."
          })).setMimeType(ContentService.MimeType.JSON);
        }
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          driver: {
            id: row[0],
            name: row[1],
            phone: row[2],
            truckModel: row[3] || "משאית הובלות",
            truckPlate: row[4] || "88-442-19"
          }
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }
  
  // Default fallback check for known demo drivers
  var defaultDrivers = [
    { name: "יוסי לוי", phone: "0528765432", truckModel: "משאית 7.5 טון + רמפה הידראולית", truckPlate: "88-442-19" },
    { name: "אבי כהן", phone: "0541234567", truckModel: "משאית 12 טון + מנוף", truckPlate: "12-345-67" },
    { name: "אמיר מסארווה", phone: "0509988776", truckModel: "מסחרית 3.5 טון", truckPlate: "33-445-56" },
    { name: "שמעון אבוטבול", phone: "0534455667", truckModel: "משאית 15 טון + מנוף", truckPlate: "77-889-90" }
  ];
  for (var j = 0; j < defaultDrivers.length; j++) {
    var d = defaultDrivers[j];
    if (d.phone === cleanInputPhone || cleanInputPhone.indexOf(d.phone) !== -1 || d.phone.indexOf(cleanInputPhone) !== -1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        driver: {
          name: d.name,
          phone: d.phone,
          truckModel: d.truckModel,
          truckPlate: d.truckPlate
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "error",
    message: "מספר הטלפון לא נמצא במאגר הנהגים המורשים."
  })).setMimeType(ContentService.MimeType.JSON);
}

// Handle driver registration with Google Drive folder and photos
function handleRegisterDriver(data) {
  var spreadsheet = getTargetSpreadsheet(data);
  var sheet = spreadsheet ? (spreadsheet.getSheetByName("מאגר נהגים") || spreadsheet.getSheetByName("צי רכב") || spreadsheet.getSheetByName("נהגים")) : null;
  if (!sheet && spreadsheet) {
    sheet = spreadsheet.insertSheet("מאגר נהגים");
    sheet.appendRow([
      "מזהה", "שם מלא", "טלפון WhatsApp", "אימייל", "סוג כלי רכב וציוד", 
      "מספר רישוי", "כושר העמסה", "אזור פעילות", "תוקף טסט", "תוקף ביטוח", 
      "סטטוס", "דירוג", "תיקיית דרייב", "תמונת פרופיל", "תמונת משאית", "תאריך הצטרפות"
    ]);
  }
  
  var folderId = "1_9vxDiPP51-GtUEeqsojmp5d1z7D8UoG";
  var folderUrl = "";
  var profilePhotoUrl = "";
  var truckPhotoUrl = "";
  var driverName = data.fullName || data.name || "ללא שם";
  var driverPhone = data.phone || data.whatsappPhone || "";
  
  try {
    var parentFolder = DriveApp.getFolderById(folderId);
    var cleanPhoneForFolder = String(driverPhone).replace(/\D/g, "");
    var driverFolderName = "Driver_" + driverName.replace(/\s+/g, '_') + "_" + cleanPhoneForFolder;
    var driverFolder = parentFolder.createFolder(driverFolderName);
    folderUrl = driverFolder.getUrl();
    
    // Save profile photo if provided
    if (data.profilePhoto && data.profilePhoto.indexOf(",") > -1) {
      var pContentType = data.profilePhoto.split(",")[0].split(":")[1].split(";")[0];
      var pRaw = data.profilePhoto.split(",")[1];
      var pBlob = Utilities.newBlob(Utilities.base64Decode(pRaw), pContentType, "תמונת_פרופיל_" + driverName);
      var pFile = driverFolder.createFile(pBlob);
      pFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      profilePhotoUrl = pFile.getUrl();
    }
    
    // Save truck photo if provided
    if (data.truckPhoto && data.truckPhoto.indexOf(",") > -1) {
      var tContentType = data.truckPhoto.split(",")[0].split(":")[1].split(";")[0];
      var tRaw = data.truckPhoto.split(",")[1];
      var tBlob = Utilities.newBlob(Utilities.base64Decode(tRaw), tContentType, "תמונת_משאית_" + driverName);
      var tFile = driverFolder.createFile(tBlob);
      tFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      truckPhotoUrl = tFile.getUrl();
    }
  } catch (driveErr) {
    Logger.log("Drive folder creation failed: " + driveErr.toString());
    folderUrl = "שגיאה ב-Drive: " + driveErr.toString();
  }
  
  var newId = "drv_" + new Date().getTime().toString().substr(-6);
  if (sheet) {
    sheet.appendRow([
      newId,
      driverName,
      "'" + driverPhone,
      data.email || "",
      data.truckType || data.truckModel || "משאית הובלות",
      data.truckPlate || "טרם הוגדר",
      data.maxWeight || "",
      data.region || "פריסה ארצית",
      data.testExpiryDate || "",
      data.insuranceExpiryDate || "",
      "active",
      "5.0",
      folderUrl,
      profilePhotoUrl,
      truckPhotoUrl,
      new Date()
    ]);
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "הנהג נרשם בהצלחה בגיליון וב-Drive!",
    driverId: newId,
    folderUrl: folderUrl
  })).setMimeType(ContentService.MimeType.JSON);
}

// Handle admin approving or disabling a driver
function handleAdminApproveDriver(data) {
  var spreadsheet = getTargetSpreadsheet(data);
  var sheet = spreadsheet ? (spreadsheet.getSheetByName("צי רכב") || spreadsheet.getSheetByName("נהגים")) : null;
  if (sheet) {
    var cleanPhone = String(data.phone || "").replace(/\D/g, "");
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      var rowPhone = String(values[i][2] || "").replace(/\D/g, "");
      if (rowPhone && (rowPhone === cleanPhone || rowPhone.indexOf(cleanPhone) !== -1 || cleanPhone.indexOf(rowPhone) !== -1)) {
        sheet.getRange(i + 1, 6).setValue(data.approve ? "active" : "inactive");
        break;
      }
    }
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "סטטוס נהג עודכן בהצלחה"
  })).setMimeType(ContentService.MimeType.JSON);
}

// Handle customer feedback logging
function handleFeedbackSubmitted(data) {
  var spreadsheet = getTargetSpreadsheet(data);
  var sheet = spreadsheet ? spreadsheet.getSheetByName("משוב לקוחות") : null;
  if (!sheet && spreadsheet) {
    sheet = spreadsheet.insertSheet("משוב לקוחות");
    sheet.appendRow(["מזהה הובלה", "דירוג", "הערות לקוח", "דורש טיפול מנהל", "מזהה פנייה", "תאריך"]);
  }
  if (sheet) {
    sheet.appendRow([
      data.moveId,
      data.rating,
      data.feedbackText || "",
      data.requiresAdminReview ? "כן" : "לא",
      data.adminReviewTicketId || "",
      new Date()
    ]);
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "משוב נרשם בהצלחה"
  })).setMimeType(ContentService.MimeType.JSON);
}

// Enable simple GET request check for web testing
function doGet(e) {
  return ContentService.createTextOutput("טראק דיל il - שירות ה-Webhook של Google Apps Script פעיל ותקין.").setMimeType(ContentService.MimeType.TEXT);
}
