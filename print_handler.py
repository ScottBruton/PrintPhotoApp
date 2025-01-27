import win32print
import win32api
import sys
import json
import os
import time as import_time

class PrintHandler:
    @staticmethod
    def is_virtual_printer(printer_name):
        virtual_printers = [
            "Microsoft Print to PDF",
            "Microsoft XPS Document Writer",
            "OneNote",
            "OneNote for Windows 10",
            "Fax",
            "Adobe PDF",
            "PDFCreator",
            "PDF24",
            "Foxit Reader PDF Printer",
            "Microsoft OneNote",
            "Virtual Printer"
        ]
        return any(vp.lower() in printer_name.lower() for vp in virtual_printers)

    @staticmethod
    def get_printers():
        try:
            printers = []
            for printer in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS):
                # Skip virtual printers
                if PrintHandler.is_virtual_printer(printer[2]):
                    continue

                try:
                    # Get detailed printer info
                    h_printer = win32print.OpenPrinter(printer[2])
                    try:
                        printer_info = win32print.GetPrinter(h_printer, 2)
                        status = printer_info['Status']
                        attributes = printer_info['Attributes']

                        # Check if printer is network printer
                        is_network = bool(attributes & win32print.PRINTER_ATTRIBUTE_NETWORK)
                        
                        # Check various status flags
                        is_ready = (status == 0 or 
                                  status & win32print.PRINTER_STATUS_POWER_SAVE or 
                                  status & win32print.PRINTER_STATUS_WARMING_UP)
                        
                        # Get more detailed status information
                        detailed_status = {
                            'isNetwork': is_network,
                            'status': status,
                            'isReady': is_ready,
                            'location': printer_info.get('Location', ''),
                            'serverName': printer_info.get('ServerName', ''),
                            'attributes': attributes
                        }

                        printers.append({
                            'name': printer[2],
                            'isDefault': printer[2] == win32print.GetDefaultPrinter(),
                            **detailed_status
                        })
                    finally:
                        win32print.ClosePrinter(h_printer)
                except Exception as e:
                    print(f"Error getting details for printer {printer[2]}: {str(e)}")
                    # Add printer with basic info if detailed info fails
                    printers.append({
                        'name': printer[2],
                        'isDefault': printer[2] == win32print.GetDefaultPrinter(),
                        'status': -1,  # Unknown status
                        'isNetwork': False,
                        'isReady': False
                    })

            return json.dumps({'success': True, 'printers': printers})
        except Exception as e:
            return json.dumps({'success': False, 'error': str(e)})

    @staticmethod
    def set_default_printer(printer_name):
        try:
            win32print.SetDefaultPrinter(printer_name)
            return json.dumps({'success': True})
        except Exception as e:
            return json.dumps({'success': False, 'error': str(e)})

    @staticmethod
    def print_file(file_path, printer_name):
        try:
            if not os.path.exists(file_path):
                return json.dumps({
                    'success': False, 
                    'error': f"File not found: {file_path}"
                })

            # Set the printer
            if printer_name:
                win32print.SetDefaultPrinter(printer_name)

            # Use ShellExecute with "printto" verb to print HTML properly
            win32api.ShellExecute(
                0,
                "printto",
                file_path,
                f'"{printer_name}"',
                ".",
                0
            )

            return json.dumps({
                'success': True,
                'message': "Print job sent successfully"
            })
        except Exception as e:
            return json.dumps({
                'success': False,
                'error': str(e)
            })

    @staticmethod
    def get_printer_status(printer_name):
        try:
            import win32print
            printer = win32print.OpenPrinter(printer_name)
            try:
                info = win32print.GetPrinter(printer, 2)
                status = info['Status']
                
                # Check if printer is in power save or warming up
                if status & win32print.PRINTER_STATUS_POWER_SAVE:
                    return 0  # Return as Ready
                if status & win32print.PRINTER_STATUS_WARMING_UP:
                    return 0  # Return as Ready
                    
                # Return the basic status
                return status
            finally:
                win32print.ClosePrinter(printer)
        except Exception as e:
            print(f"Error getting printer status: {str(e)}")
            return -1  # Unknown status

if __name__ == "__main__":
    handler = PrintHandler()
    
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No command provided'}))
        sys.exit(1)

    command = sys.argv[1]
    
    if command == "get_printers":
        print(handler.get_printers())
    elif command == "set_default":
        if len(sys.argv) < 3:
            print(json.dumps({'success': False, 'error': 'No printer name provided'}))
            sys.exit(1)
        print(handler.set_default_printer(sys.argv[2]))
    elif command == "print":
        if len(sys.argv) < 4:
            print(json.dumps({'success': False, 'error': 'Missing file path or printer name'}))
            sys.exit(1)
        print(handler.print_file(sys.argv[2], sys.argv[3]))
    else:
        print(json.dumps({'success': False, 'error': 'Invalid command'})) 