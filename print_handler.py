import win32print
import win32api
import sys
import json
import os
import tempfile

# Update the log_error function to use temp directory
def log_error(message):
    log_path = os.path.join(tempfile.gettempdir(), 'printer_error.log')
    try:
        with open(log_path, 'a') as f:
            f.write(f"{message}\n")
    except Exception as e:
        # If logging fails, print to stderr as fallback
        print(f"Logging error: {str(e)}\n{message}", file=sys.stderr)

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
            enum_flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
            
            # Log the start of enumeration
            log_error("Starting printer enumeration")
            
            for printer in win32print.EnumPrinters(enum_flags):
                try:
                    # Skip virtual printers
                    if PrintHandler.is_virtual_printer(printer[2]):
                        continue

                    printer_name = printer[2]
                    log_error(f"Processing printer: {printer_name}")

                    # Get detailed printer info
                    h_printer = win32print.OpenPrinter(printer_name)
                    try:
                        printer_info = win32print.GetPrinter(h_printer, 2)
                        status = printer_info['Status']
                        attributes = printer_info['Attributes']

                        is_network = bool(attributes & win32print.PRINTER_ATTRIBUTE_NETWORK)
                        is_ready = (status == 0 or 
                                  status & win32print.PRINTER_STATUS_POWER_SAVE or 
                                  status & win32print.PRINTER_STATUS_WARMING_UP)

                        detailed_status = {
                            'isNetwork': is_network,
                            'status': status,
                            'isReady': is_ready,
                            'location': printer_info.get('Location', ''),
                            'serverName': printer_info.get('ServerName', ''),
                            'attributes': attributes
                        }

                        printers.append({
                            'name': printer_name,
                            'isDefault': printer_name == win32print.GetDefaultPrinter(),
                            **detailed_status
                        })
                        
                        log_error(f"Successfully processed printer: {printer_name}")
                        
                    finally:
                        win32print.ClosePrinter(h_printer)
                except Exception as e:
                    log_error(f"Error processing printer {printer[2]}: {str(e)}")
                    # Add printer with basic info if detailed info fails
                    printers.append({
                        'name': printer[2],
                        'isDefault': printer[2] == win32print.GetDefaultPrinter(),
                        'status': -1,
                        'isNetwork': False,
                        'isReady': False
                    })

            return json.dumps({'success': True, 'printers': printers})
        except Exception as e:
            error_msg = f"Fatal error in get_printers: {str(e)}"
            log_error(error_msg)
            return json.dumps({'success': False, 'error': error_msg})

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
    try:
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
    except Exception as e:
        log_error(f"Main execution error: {str(e)}")
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(2) 