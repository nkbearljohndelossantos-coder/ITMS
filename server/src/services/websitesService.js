const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

class WebsitesService {
  async getAllWebsites({ page = 1, limit = 10, search = '', status = '' }) {
    const query = db('website_monitoring')
      .leftJoin('employees', 'website_monitoring.admin_employee_id', 'employees.id')
      .select(
        'website_monitoring.*',
        db.raw("concat(employees.first_name, ' ', employees.last_name) as admin_name")
      )
      .whereNull('website_monitoring.deleted_at');

    if (status) {
      query.where('website_monitoring.status', status);
    }

    if (search) {
      query.where((builder) => {
        builder.where('website_monitoring.name', 'like', `%${search}%`)
          .orWhere('website_monitoring.domain', 'like', `%${search}%`);
      });
    }

    const countQuery = db.select(db.raw('count(*) as count')).from(query.clone().as('subquery'));
    const [{ count }] = await countQuery;

    const offset = (page - 1) * limit;
    const data = await query
      .orderBy('website_monitoring.name', 'asc')
      .limit(limit)
      .offset(offset);

    return {
      websites: data,
      pagination: {
        total: parseInt(count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    };
  }

  async getWebsiteById(id) {
    return db('website_monitoring')
      .leftJoin('employees', 'website_monitoring.admin_employee_id', 'employees.id')
      .select(
        'website_monitoring.*',
        db.raw("concat(employees.first_name, ' ', employees.last_name) as admin_name")
      )
      .where('website_monitoring.id', id)
      .whereNull('website_monitoring.deleted_at')
      .first();
  }

  async createWebsite(data, req) {
    const [id] = await db('website_monitoring').insert({
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    });

    const newWeb = await this.getWebsiteById(id);
    await logAudit(req, { action: 'Create Website', module: 'Websites', recordId: id, newValues: newWeb });
    return newWeb;
  }

  async updateWebsite(id, data, req) {
    const oldWeb = await this.getWebsiteById(id);
    if (!oldWeb) return null;

    await db('website_monitoring').where('id', id).update({
      ...data,
      updated_at: new Date()
    });

    const newWeb = await this.getWebsiteById(id);
    await logAudit(req, { action: 'Update Website', module: 'Websites', recordId: id, oldValues: oldWeb, newValues: newWeb });
    return newWeb;
  }

  async softDeleteWebsite(id, req) {
    const oldWeb = await this.getWebsiteById(id);
    if (!oldWeb) return false;

    await db('website_monitoring').where('id', id).update({
      deleted_at: new Date(),
      updated_at: new Date()
    });

    await logAudit(req, { action: 'Delete Website', module: 'Websites', recordId: id, oldValues: oldWeb });
    return true;
  }

  async getWebsiteLogs(websiteId, { page = 1, limit = 50 }) {
    const query = db('website_uptime_logs')
      .where('website_id', websiteId);

    const countQuery = db.select(db.raw('count(*) as count')).from(query.clone().as('subquery'));
    const [{ count }] = await countQuery;

    const offset = (page - 1) * limit;
    const logs = await query
      .orderBy('checked_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      logs,
      pagination: {
        total: parseInt(count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    };
  }
}

module.exports = new WebsitesService();
