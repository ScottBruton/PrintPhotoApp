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
            "Microsoft OneNote"
        ]
        return any(vp.lower() in printer_name.lower() for vp in virtual_printers)

    @staticmethod
    def get_printers():
        printers = []
        try:
            # Try to get both local and network printers
            printer_flags = (
                win32print.PRINTER_ENUM_LOCAL | 
                win32print.PRINTER_ENUM_CONNECTIONS | 
                win32print.PRINTER_ENUM_NETWORK
            )
            
            for printer in win32print.EnumPrinters(printer_flags):
                # Only add the printer if it's not a virtual printer
                if not PrintHandler.is_virtual_printer(printer[2]):
                    try:
                        # Get detailed printer info
                        h_printer = win32print.OpenPrinter(printer[2])
                        try:
                            # Get level 2 info for status
                            printer_info = win32print.GetPrinter(h_printer, 2)
                            status = printer_info['Status']
                            
                            # Get additional printer info
                            printer_data = {
                                'name': printer[2],
                                'isDefault': printer[2] == win32print.GetDefaultPrinter(),
                                'status': status,
                                'attributes': printer_info.get('Attributes', 0),
                                'isNetwork': bool(printer_info.get('Attributes', 0) & 0x00000010),  # PRINTER_ATTRIBUTE_NETWORK
                                'isShared': bool(printer_info.get('Attributes', 0) & 0x00000008),   # PRINTER_ATTRIBUTE_SHARED
                                'location': printer_info.get('Location', ''),
                                'serverName': printer_info.get('ServerName', '')
                            }
                            printers.append(printer_data)
                        finally:
                            win32print.ClosePrinter(h_printer)
                    except Exception as printer_error:
                        # If we can't get detailed info, add basic info
                        print(f"Warning: Could not get detailed info for {printer[2]}: {printer_error}")
                        printer_data = {
                            'name': printer[2],
                            'isDefault': printer[2] == win32print.GetDefaultPrinter(),
                            'status': 0,  # Unknown status
                            'attributes': 0,
                            'error': str(printer_error)
                        }
                        printers.append(printer_data)

            # Sort printers: Default first, then by name
            printers.sort(key=lambda x: (-x['isDefault'], x['name'].lower()))
            
            return json.dumps({
                'success': True, 
                'printers': printers,
                'timestamp': import_time.time()  # Add timestamp for refresh tracking
            })
        except Exception as e:
            return json.dumps({
                'success': False, 
                'error': str(e),
                'timestamp': import_time.time()
            })

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
                raise FileNotFoundError(f"File not found: {file_path}")

            # Set the printer
            if printer_name:
                win32print.SetDefaultPrinter(printer_name)

            # Print the file
            win32api.ShellExecute(
                0,
                "print",
                file_path,
                None,
                ".",
                0
            )
            return json.dumps({'success': True})
        except Exception as e:
            return json.dumps({'success': False, 'error': str(e)})

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