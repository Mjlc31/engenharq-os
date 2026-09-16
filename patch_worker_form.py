with open('src/components/features/workers/WorkerForm.tsx', 'r') as f:
    content = f.read()

old_func = """  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave({
      full_name: fullName,
      cpf,
      registration_number: registration,
      email: email || null,
      status: status,
      current_site_id: siteId || null,
      initial_role: initialRole || null,
      current_role: initialRole || null,
      admission_date: admissionDate || null,
      birth_date: birthDate || null,
      work_sector: workSector || null,
      uniform_size: uniformSize || null,
      boot_size: bootSize || null,
      apt_for_height_and_confined_space: aptForHeight,
      phone_contact: phoneContact || null,
      reference_photo_url: referencePhotoUrl || null
    });
  };"""

new_func = """  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        full_name: fullName,
        cpf,
        registration_number: registration,
        email: email || null,
        status: status,
        current_site_id: siteId || null,
        initial_role: initialRole || null,
        current_role: initialRole || null,
        admission_date: admissionDate || null,
        birth_date: birthDate || null,
        work_sector: workSector || null,
        uniform_size: uniformSize || null,
        boot_size: bootSize || null,
        apt_for_height_and_confined_space: aptForHeight,
        phone_contact: phoneContact || null,
        reference_photo_url: referencePhotoUrl || null
      });
    } finally {
      setIsSubmitting(false);
    }
  };"""

content = content.replace(old_func, new_func)

with open('src/components/features/workers/WorkerForm.tsx', 'w') as f:
    f.write(content)
